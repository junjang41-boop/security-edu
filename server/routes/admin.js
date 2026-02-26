const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const { db, storage } = require('../firebase');

// ─── 파일 업로드 설정 ───────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ─── 관리자 로그인 ──────────────────────────────────
router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  // 슈퍼관리자(admin)는 .env로 체크
  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, isSuper: true, companyName: '슈퍼관리자' });
  }

  // 일반 관리자는 Firestore에서 체크
  try {
    const doc = await db.collection('admins').doc(id).get();
    if (!doc.exists || doc.data().password !== password) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' });
    }
    const data = doc.data();
    res.json({ success: true, isSuper: false, companyName: data.companyName, adminId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ─── 보안교육 자료 업로드 (PDF/PPT) ────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    // 파일 형식 체크
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'PDF 또는 PPT 파일만 업로드 가능합니다.' });
    }

    // Firebase Storage에 업로드
    const bucket = storage.bucket();
    // 한글 파일명 제거하고 타임스탬프로만 저장
    const ext = file.originalname.split('.').pop(); // 확장자 추출 (pdf, pptx 등)
    const fileName = `materials/${Date.now()}.${ext}`;
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(file.buffer, { contentType: file.mimetype });
    // Firebase Storage 공개 URL 형식으로 변경
    await fileUpload.makePublic();
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    // Firestore에 저장
    await db.collection('settings').doc('material').set({
      fileName: file.originalname,
      fileUrl,
      uploadedAt: new Date(),
    });

    res.json({ success: true, message: '업로드 완료', fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
});

// ─── 유튜브 링크 저장 ───────────────────────────────
router.post('/upload-youtube', async (req, res) => {
  try {
    const { url } = req.body;

    // 유튜브 URL 검증
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return res.status(400).json({ success: false, message: '유튜브 링크만 등록 가능합니다.' });
    }

    await db.collection('settings').doc('youtube').set({
      url,
      updatedAt: new Date(),
    });

    res.json({ success: true, message: '유튜브 링크 저장 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
});

// ─── 인원명부 업로드 (엑셀) ─────────────────────────
router.post('/upload-employees', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    // 엑셀 형식 체크
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Excel 파일만 업로드 가능합니다.' });
    }

    // 엑셀 파싱
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // 필요한 컬럼 4개 (보안교육이수여부는 없어도 됨)
    const requiredColumns = ['사번', '이름', '이메일'];
    const optionalColumns = ['보안교육이수여부'];

    // 전체 행에서 공백 제거 후 필요한 컬럼만 추출
    const cleanRows = rows.map(row => {
      const cleaned = {};
      Object.keys(row).forEach(key => {
        const trimmedKey = key.trim();
        const trimmedValue = typeof row[key] === 'string' ? row[key].trim() : row[key];
        if ([...requiredColumns, ...optionalColumns].includes(trimmedKey)) {
          cleaned[trimmedKey] = trimmedValue;
        }
      });

      // 보안교육이수여부가 비어있으면 자동으로 "미완료" 채우기
      if (!cleaned['보안교육이수여부']) {
        cleaned['보안교육이수여부'] = '미완료';
      }

      return cleaned;
    });

    // 필수 컬럼 체크 (사번, 이름, 이메일만 체크)
    const firstRow = cleanRows[0];
    for (const col of requiredColumns) {
      if (!(col in firstRow)) {
        return res.status(400).json({
          success: false,
          message: `"${col}" 컬럼을 찾을 수 없습니다. 엑셀 헤더를 확인해주세요.`,
        });
      }
    }

    // Firestore에 저장
    const batch = db.batch();
    for (const row of cleanRows) {
      const docRef = db.collection('employees').doc(String(row['사번']));
batch.set(docRef, {
  사번: String(row['사번']) || '',
  이름: String(row['이름'] || ''),
  이메일: String(row['이메일'] || ''),
  보안교육이수여부: String(row['보안교육이수여부'] || '미완료'),
  companyId: req.body.adminId || '',
});
    }
    await batch.commit();

    res.json({ success: true, message: `${rows.length}명 업로드 완료` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
});

// ─── 이수 현황 엑셀 다운로드 ────────────────────────
router.get('/download-employees', async (req, res) => {
  try {
    const [employeesSnapshot, resultsSnapshot] = await Promise.all([
      db.collection('employees').get(),
      db.collection('quiz_results').get(),
    ]);

    // 합격한 결과만 사번 기준으로 이수일시 맵 생성
    const resultMap = {};
    resultsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.합격여부 === '합격') {
        resultMap[String(data.사번)] = data.응시일시?.toDate
          ? data.응시일시.toDate().toLocaleString('ko-KR')
          : data.응시일시;
      }
    });

    const rows = employeesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        사번: data.사번,
        이름: data.이름,
        이메일: data.이메일,
        보안교육이수여부: data.보안교육이수여부,
        이수일시: resultMap[String(data.사번)] || '',
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '인원명부');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '다운로드 실패' });
  }
});

// 테스트 이메일 발송
router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    await sgMail.send({
      from: {
        email: process.env.EMAIL_USER,
        name: '한솔아이원스 보안교육',
      },
      to: email,
      subject: '[한솔아이원스] 테스트 이메일입니다.',
      html: '<p>테스트 이메일 발송 성공! 🎉</p>',
    });
    console.log(`테스트 이메일 발송 완료: ${email}`);
    res.json({ success: true, message: '테스트 이메일 발송 완료!' });
  } catch (err) {
    console.log('테스트 이메일 발송 실패:', err.message);
    res.status(500).json({ success: false, message: '발송 실패: ' + err.message });
  }
});
// ✅ 시스템 설정 불러오기
router.get('/site-config', async (req, res) => {
  const { adminId } = req.query;
  try {
    const doc = await db.collection('settings').doc(adminId || 'siteConfig').get();
    if (!doc.exists) return res.json({ companyName: '', systemName: '' });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ message: '설정 불러오기 실패' });
  }
});

// ✅ 시스템 설정 저장
router.post('/site-config', async (req, res) => {
  const { adminId, systemName } = req.body;
  try {
    await db.collection('settings').doc(adminId).set({ systemName }, { merge: true });
    res.json({ message: '저장 완료' });
  } catch (err) {
    res.status(500).json({ message: '저장 실패' });
  }
});

// 회사 목록 조회 (임직원 로그인 선택박스용)
router.get('/companies', async (req, res) => {
  try {
    const snapshot = await db.collection('admins').get();

    // 회사명 기준으로 그룹핑
    const companyMap = {};
    snapshot.docs.forEach(doc => {
      const { companyName, systemName } = doc.data();
      if (!companyMap[companyName]) companyMap[companyName] = [];
      companyMap[companyName].push({ adminId: doc.id, systemName: systemName || '' });
    });

    // [{ companyName, educations: [{adminId, systemName}] }] 형태로 반환
    const companies = Object.entries(companyMap).map(([companyName, educations]) => ({
      companyName,
      educations,
    }));

    res.json({ companies });
  } catch (err) {
    res.status(500).json({ message: '조회 실패' });
  }
});

// 계정 생성 (슈퍼관리자만)
router.post('/create-account', async (req, res) => {
  const { requesterId, newId, password, companyName, initialPassword } = req.body;
  if (requesterId !== process.env.ADMIN_ID) {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const existing = await db.collection('admins').doc(newId).get();
    if (existing.exists) return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
    const initPw = initialPassword || 'Hansol123!@#';
    await db.collection('admins').doc(newId).set({
      password: initPw,
      companyName,
      mustChangePassword: true,
    });
    await db.collection('settings').doc(newId).set({ companyName, systemName: '교육 수강 시스템' });
    res.json({ message: '계정 생성 완료' });
  } catch (err) {
    res.status(500).json({ message: '계정 생성 실패' });
  }
});
// 계정 목록 조회 (슈퍼관리자만)
router.get('/accounts', async (req, res) => {
  const { requesterId } = req.query;
  if (requesterId !== process.env.ADMIN_ID) {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const snapshot = await db.collection('admins').get();
    const accounts = snapshot.docs.map(doc => ({
      id: doc.id,
      companyName: doc.data().companyName,
      mustChangePassword: doc.data().mustChangePassword || false,
    }));
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ message: '조회 실패' });
  }
});

// 암호 변경
router.post('/change-password', async (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ message: '암호는 8자리 이상, 대문자/소문자/숫자/특수문자(!@#$%^&*)를 모두 포함해야 합니다.' });
  }
  try {
    const doc = await db.collection('admins').doc(adminId).get();
    if (!doc.exists || doc.data().password !== currentPassword) {
      return res.status(401).json({ message: '현재 암호가 올바르지 않습니다.' });
    }
    await db.collection('admins').doc(adminId).update({
      password: newPassword,
      mustChangePassword: false,
    });
    res.json({ message: '암호 변경 완료' });
  } catch (err) {
    res.status(500).json({ message: '암호 변경 실패' });
  }
});

module.exports = router;