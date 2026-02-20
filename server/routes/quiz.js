const express = require('express');
const router = express.Router();
const { db, storage } = require('../firebase');
const OpenAI = require('openai');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');
// youtube-captions-scraper 미사용

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Gmail SMTP 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 퀴즈 50문제 생성
router.post('/generate', async (req, res) => {
  try {
    const [youtubeDoc, materialDoc] = await Promise.all([
      db.collection('settings').doc('youtube').get(),
      db.collection('settings').doc('material').get(),
    ]);

    const youtubeUrl = youtubeDoc.exists ? youtubeDoc.data().url : '';
    const materialData = materialDoc.exists ? materialDoc.data() : null;

    let pdfText = '';
    let youtubeText = '';

    // PDF 텍스트 추출
    if (materialData && materialData.fileUrl) {
      try {
        const bucket = storage.bucket();
        const urlObj = new URL(materialData.fileUrl);
        const filePath = decodeURIComponent(urlObj.pathname.split('/o/')[1]);
        console.log('파일 경로:', filePath);

        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        const pdfData = await pdfParse(buffer);
        pdfText = pdfData.text.slice(0, 4000);
        console.log(`PDF 텍스트 추출 완료: ${pdfText.length}자`);
      } catch (pdfErr) {
        console.log('PDF 텍스트 추출 실패:', pdfErr.message);
        pdfText = materialData.fileName || '';
      }
    }

    // 유튜브 자막 미사용 - PDF 기반으로만 문제 생성
    console.log('PDF 기반으로 문제를 생성합니다.');

   const prompt = `
당신은 교육 퀴즈 출제 전문가입니다.
아래 교육 자료 내용을 기반으로 4지선다형 퀴즈를 정확히 50문항 만들어주세요.

[교육 자료 내용 (PDF)]
${pdfText || '내용을 가져올 수 없습니다.'}

규칙:
1. 반드시 PDF 교육 자료 내용에서만 문제를 출제하세요.
2. PDF에 없는 내용으로 문제를 만들면 안됩니다.
3. 보기 4개는 명확하게 구분되어야 합니다.
4. 모호하거나 중복된 보기는 절대 안됩니다.
5. 난이도는 중간 수준으로 해주세요.
6. 반드시 50문항을 모두 채워주세요.

반드시 아래 JSON 형식으로만 답변해주세요.

{
  "questions": [
    {
      "id": 1,
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0
    }
  ]
}

answer는 정답 보기의 인덱스 번호입니다. (0=첫번째, 1=두번째, 2=세번째, 3=네번째)
`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const allQuestions = result.questions.map((q, i) => ({ ...q, id: i + 1 }));

    await db.collection('settings').doc('quiz').set({
      questions: allQuestions,
      generatedAt: new Date(),
    });

    res.json({ success: true, total: allQuestions.length, message: `${allQuestions.length}문제 생성 완료` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '퀴즈 생성 실패: ' + err.message });
  }
});

// 랜덤 10문제 뽑아서 가져오기
router.get('/get', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('quiz').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다. 관리자에게 문의하세요.' });
    }

    const allQuestions = doc.data().questions;
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10).map((q, i) => ({ ...q, id: i + 1 }));

    res.json({ success: true, questions: selected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 퀴즈 채점
router.post('/submit', async (req, res) => {
  try {
    const { answers, questions, employee } = req.body;

    let correct = 0;
    questions.forEach((q, i) => {
      if (q.answer === answers[i]) correct++;
    });

    const passed = correct >= 6;

    // 퀴즈 결과 저장
    await db.collection('quiz_results').add({
      사번: employee.사번,
      이름: employee.이름,
      점수: correct,
      합격여부: passed ? '합격' : '불합격',
      응시일시: new Date(),
    });

 // 합격 시 처리
    if (passed) {
      // 인원명부 자동 업데이트
      await db.collection('employees').doc(String(employee.사번)).update({
        보안교육이수여부: '완료',
      });
      console.log(`${employee.이름}(${employee.사번}) 이수 완료 처리됨`);

      // 이메일 발송
      const today = new Date();
      const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #333;">보안교육 이수 완료</h1>
            <p style="color: #888;">Security Education Certificate</p>
          </div>

          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
              안녕하세요, <b>${employee.이름}</b>님!<br/>
              보안교육을 성공적으로 이수하셨습니다. 🎉
            </p>

            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; color: #888; width: 100px;">성명</td>
                <td style="padding: 12px; color: #333; font-weight: bold;">${employee.이름}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; color: #888;">사번</td>
                <td style="padding: 12px; color: #333; font-weight: bold;">${employee.사번}</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; color: #888;">교육명</td>
                <td style="padding: 12px; color: #333; font-weight: bold;">정보보안 교육</td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; color: #888;">점수</td>
                <td style="padding: 12px; color: #333; font-weight: bold;">${correct} / ${questions.length}</td>
              </tr>
              <tr>
                <td style="padding: 12px; color: #888;">이수일</td>
                <td style="padding: 12px; color: #333; font-weight: bold;">${dateStr}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; color: #888; font-size: 13px;">
            <p>위 사람은 정보보안 교육을 성실히 이수하였음을 증명합니다.</p>
            <p style="font-weight: bold; color: #333;">한솔아이원스(주)</p>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"한솔아이원스 보안교육" <${process.env.EMAIL_USER}>`,
          to: employee.이메일,
          subject: `[한솔아이원스] ${employee.이름}님의 보안교육 이수 완료 안내`,
          html: emailHtml,
        });
        console.log(`이메일 발송 완료: ${employee.이메일}`);
      } catch (mailErr) {
        console.log('이메일 발송 실패:', mailErr.message);
      }
    }

    res.json({ success: true, correct, total: questions.length, passed });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '채점 실패' });
  }
});

// 전체 퀴즈 목록 가져오기 (관리자용)
router.get('/all', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('quiz').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다.' });
    }
    const questions = doc.data().questions;
    console.log('전체 문제 수:', questions.length);
    res.json({ success: true, questions: questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 퀴즈 엑셀 다운로드
router.get('/download', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('quiz').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다.' });
    }

    const questions = doc.data().questions;
    const rows = questions.map((q, i) => ({
      번호: i + 1,
      문제: q.question,
      보기1: q.options[0],
      보기2: q.options[1],
      보기3: q.options[2],
      보기4: q.options[3],
      정답번호: q.answer + 1,
      정답내용: q.options[q.answer],
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '퀴즈목록');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=quiz.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '다운로드 실패' });
  }
});

module.exports = router;