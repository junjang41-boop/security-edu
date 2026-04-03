const express = require('express');
const router = express.Router();
const { db } = require('../db');
const OpenAI = require('openai');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PDF를 이미지로 변환 후 GPT Vision으로 텍스트 추출
async function extractTextFromPDF(filePath) {
  const tmpDir = `/tmp/pdf_images_${Date.now()}`;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    execSync(`pdftoppm -png -r 250 -f 1 -l 10 "${filePath}" ${tmpDir}/page`);

    const imageFiles = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .slice(0, 10);

    if (imageFiles.length === 0) return '';

    console.log(`PDF ${imageFiles.length}페이지 이미지 변환 완료`);

    const imageContents = imageFiles.map(f => ({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${fs.readFileSync(path.join(tmpDir, f)).toString('base64')}`,
        detail: 'high',
      },
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            {
              type: 'text',
              text: '위 이미지들은 교육 자료 PDF 페이지들입니다. 표, 항목, 숫자, 날짜 등 모든 텍스트를 빠짐없이 그대로 추출해주세요. 요약하거나 생략하지 말고 원문 그대로 전부 적어주세요.',
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const extractedText = response.choices[0].message.content;
    console.log(`GPT Vision 텍스트 추출 완료: ${extractedText.length}자`);
    return extractedText;

  } catch (err) {
    console.log('PDF Vision 추출 실패:', err.message);
    return '';
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
  }
}

// 퀴즈 50문제 생성
router.post('/generate', async (req, res) => {
  try {
    const adminId = req.body.adminId || 'default';

    const [youtubeResult, materialResult] = await Promise.all([
      db.query('SELECT url FROM youtube_settings WHERE admin_id = $1', [adminId]),
      db.query('SELECT file_name, file_path FROM material_settings WHERE admin_id = $1', [adminId]),
    ]);

    const materialData = materialResult.rows.length > 0 ? materialResult.rows[0] : null;

    let pdfText = '';

    if (materialData && materialData.file_path) {
      console.log('GPT Vision으로 PDF 텍스트 추출 시작...');
      pdfText = await extractTextFromPDF(materialData.file_path);
      if (!pdfText) {
        pdfText = materialData.file_name || '';
        console.log('텍스트 추출 실패, 파일명으로 대체');
      }
    }

    console.log('PDF 기반으로 문제를 생성합니다.');

    const prompt = `
당신은 교육 퀴즈 출제 전문가입니다.
아래 교육 자료 내용을 기반으로 퀴즈를 정확히 50문항 만들어주세요.

[교육 자료 내용]
${pdfText || '내용을 가져올 수 없습니다.'}

문제 구성:
- 4지선다형 30문항 + O/X 문제 20문항 (총 50문항)
- O/X 문제는 options: ["O", "X"] 딱 2개만 넣고 answer는 0(O) 또는 1(X)로 설정

규칙:
1. 반드시 교육 자료 내용에서만 문제를 출제하세요.
2. 난이도는 쉽게 - 핵심 내용을 그대로 묻는 기본 문제로 출제하세요.
3. 4지선다 보기 중 1~2개는 정답을 유추할 수 있는 힌트성 보기를 포함하세요.
4. 모호하거나 함정성 문제는 절대 출제하지 마세요.
5. 반드시 50문항을 모두 채워주세요.
6. 문제는 짧고 명확하게 작성해주세요.

반드시 아래 JSON 형식으로만 답변해주세요.

{
  "questions": [
    {
      "id": 1,
      "question": "문제 내용",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0
    },
    {
      "id": 31,
      "question": "OX 문제 내용 (맞으면 O, 틀리면 X)",
      "options": ["O", "X"],
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
    console.log('GPT 응답 키:', Object.keys(result));

    const rawQuestions = result.questions || result.quiz || result.quizzes || result.items || Object.values(result)[0];
    if (!rawQuestions || !Array.isArray(rawQuestions)) {
      throw new Error('GPT 응답에서 문제 목록을 찾을 수 없습니다. 다시 시도해주세요.');
    }

    const allQuestions = rawQuestions.map((q, i) => ({ ...q, id: i + 1 }));

    await db.query(
      `INSERT INTO quiz_settings (admin_id, questions, generated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (admin_id) DO UPDATE
         SET questions = EXCLUDED.questions, generated_at = NOW()`,
      [adminId, JSON.stringify(allQuestions)]
    );

    res.json({ success: true, total: allQuestions.length, message: `${allQuestions.length}문제 생성 완료` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '퀴즈 생성 실패: ' + err.message });
  }
});

// 랜덤 10문제 뽑아서 가져오기
router.get('/get', async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await db.query(
      'SELECT questions FROM quiz_settings WHERE admin_id = $1',
      [companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다. 관리자에게 문의하세요.' });
    }

    const allQuestions = result.rows[0].questions;
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

    await db.query(
      `INSERT INTO quiz_results (company_id, "사번", "이름", "점수", "합격여부", "응시일시")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [employee.companyId, String(employee.사번), employee.이름, correct, passed ? '합격' : '불합격']
    );

    if (passed) {
      await db.query(
        `UPDATE employees SET "보안교육이수여부" = '완료'
         WHERE company_id = $1 AND "사번" = $2`,
        [employee.companyId, String(employee.사번)]
      );
      console.log(`${employee.이름}(${employee.사번}) 이수 완료 처리됨`);

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

      transporter.sendMail({
        from: `"한솔아이원스 보안교육" <${process.env.EMAIL_USER}>`,
        to: employee.이메일,
        subject: `[한솔아이원스] ${employee.이름}님의 보안교육 이수 완료 안내`,
        html: emailHtml,
      }).then(() => {
        console.log(`이메일 발송 완료: ${employee.이메일}`);
      }).catch((mailErr) => {
        console.log('이메일 발송 실패:', mailErr.message);
      });
    }

    res.json({ success: true, correct, total: questions.length, passed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '채점 실패' });
  }
});

// 전체 퀴즈 목록 (관리자용)
router.get('/all', async (req, res) => {
  try {
    const adminId = req.query.adminId || req.body.adminId;
    const result = await db.query(
      'SELECT questions FROM quiz_settings WHERE admin_id = $1',
      [adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다.' });
    }
    const questions = result.rows[0].questions;
    console.log('전체 문제 수:', questions.length);
    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 퀴즈 엑셀 다운로드
router.get('/download', async (req, res) => {
  try {
    const { adminId } = req.query;
    const result = await db.query(
      'SELECT questions FROM quiz_settings WHERE admin_id = $1',
      [adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '생성된 퀴즈가 없습니다.' });
    }

    const questions = result.rows[0].questions;
    const rows = questions.map((q, i) => ({
      번호: i + 1,
      문제: q.question,
      보기1: q.options[0],
      보기2: q.options[1] || '',
      보기3: q.options[2] || '',
      보기4: q.options[3] || '',
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
// 서명 이미지 수신 후 이메일 발송
router.post('/submit-signature', async (req, res) => {
  try {
    const { employee, signatureImage, quizResult } = req.body;

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // base64에서 이미지 데이터 추출
    const base64Data = signatureImage.replace(/^data:image\/png;base64,/, '');

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
              <td style="padding: 12px; color: #333; font-weight: bold;">${quizResult.correct} / ${quizResult.total}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 12px; color: #888;">이수일</td>
              <td style="padding: 12px; color: #333; font-weight: bold;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #888;">서명</td>
              <td style="padding: 12px;">
                <img src="cid:signature" alt="서명" style="height: 60px;" />
              </td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; color: #888; font-size: 13px;">
          <p>위 사람은 정보보안 교육을 성실히 이수하였음을 증명합니다.</p>
          <p style="font-weight: bold; color: #333;">한솔아이원스(주)</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"한솔아이원스 보안교육" <${process.env.EMAIL_USER}>`,
      to: employee.이메일,
      subject: `[한솔아이원스] ${employee.이름}님의 보안교육 이수증 (서명 포함)`,
      html: emailHtml,
      attachments: [
        {
          filename: 'signature.png',
          content: base64Data,
          encoding: 'base64',
          cid: 'signature',
        },
      ],
    });

    console.log(`서명 포함 이메일 발송 완료: ${employee.이메일}`);
    res.json({ success: true });
  } catch (err) {
    console.error('서명 이메일 발송 실패:', err);
    res.status(500).json({ success: false });
  }
});


// 특정 직원 이수여부 초기화
router.post('/reset-employee', async (req, res) => {
  const { adminId, 사번 } = req.body;
  try {
    await db.query(
      `UPDATE employees SET "보안교육이수여부" = '미완료'
       WHERE company_id = $1 AND "사번" = $2`,
      [adminId, String(사번)]
    );
    res.json({ success: true, message: '초기화 완료' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 전체 직원 이수여부 초기화
router.post('/reset-all-employees', async (req, res) => {
  const { adminId } = req.body;
  try {
    await db.query(
      `UPDATE employees SET "보안교육이수여부" = '미완료'
       WHERE company_id = $1`,
      [adminId]
    );
    await db.query(
      `DELETE FROM quiz_results WHERE company_id = $1`,
      [adminId]
    );
    res.json({ success: true, message: '전체 초기화 완료' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;