const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { db } = require('../db');

// ─── 파일 업로드 설정 (로컬 디스크) ────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads/materials');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ─── 관리자 로그인 ──────────────────────────────────
router.post('/login', async (req, res) => {
  const { id, password } = req.body;

  // 슈퍼관리자는 .env로 체크
  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, isSuper: true, companyName: '슈퍼관리자' });
  }

  try {
    const result = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (result.rows.length === 0 || result.rows[0].password !== password) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' });
    }
    const row = result.rows[0];
    res.json({
      success: true,
      isSuper: false,
      companyName: row.company_name,
      adminId: id,
      mustChangePassword: row.must_change_password || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ─── 보안교육 자료 업로드 (PDF/PPT) ────────────────
router.post('/upload-material', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'PDF 또는 PPT 파일만 업로드 가능합니다.' });
    }

    const adminId = req.body.adminId || 'default';
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // 이전 파일 삭제
    const prev = await db.query('SELECT file_path FROM material_settings WHERE admin_id = $1', [adminId]);
    if (prev.rows.length > 0 && prev.rows[0].file_path) {
      try { fs.unlinkSync(prev.rows[0].file_path); } catch (_) {}
    }

    await db.query(
      `INSERT INTO material_settings (admin_id, file_name, file_path, uploaded_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (admin_id) DO UPDATE
         SET file_name = EXCLUDED.file_name,
             file_path = EXCLUDED.file_path,
             uploaded_at = NOW()`,
      [adminId, originalName, file.path]
    );

    res.json({ success: true, message: '업로드 완료', filePath: file.path });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
});

// ─── 유튜브 링크 저장 ───────────────────────────────
router.post('/upload-youtube', async (req, res) => {
  try {
    const { url, adminId: bodyAdminId } = req.body;
    const adminId = bodyAdminId || 'default';

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      return res.status(400).json({ success: false, message: '유튜브 링크만 등록 가능합니다.' });
    }

    await db.query(
      `INSERT INTO youtube_settings (admin_id, url, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (admin_id) DO UPDATE
         SET url = EXCLUDED.url, updated_at = NOW()`,
      [adminId, url]
    );

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
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'Excel 파일만 업로드 가능합니다.' });
    }

    const workbook = xlsx.readFile(file.path);
    fs.unlinkSync(file.path); // 엑셀 파일은 임시 처리 후 삭제
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const requiredColumns = ['사번', '이름', '이메일'];
    const optionalColumns = ['보안교육이수여부'];

    const cleanRows = rows.map(row => {
      const cleaned = {};
      Object.keys(row).forEach(key => {
        const trimmedKey = key.trim();
        const trimmedValue = typeof row[key] === 'string' ? row[key].trim() : row[key];
        if ([...requiredColumns, ...optionalColumns].includes(trimmedKey)) {
          cleaned[trimmedKey] = trimmedValue;
        }
      });
      if (!cleaned['보안교육이수여부']) cleaned['보안교육이수여부'] = '미완료';
      return cleaned;
    });

    const firstRow = cleanRows[0];
    for (const col of requiredColumns) {
      if (!(col in firstRow)) {
        return res.status(400).json({
          success: false,
          message: `"${col}" 컬럼을 찾을 수 없습니다. 엑셀 헤더를 확인해주세요.`,
        });
      }
    }

    const adminId = req.body.adminId || 'default';

    // 트랜잭션으로 기존 명부 삭제 후 재삽입
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM employees WHERE company_id = $1', [adminId]);
      for (const row of cleanRows) {
        await client.query(
          `INSERT INTO employees (company_id, "사번", "이름", "이메일", "보안교육이수여부")
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (company_id, "사번") DO UPDATE
             SET "이름" = EXCLUDED."이름",
                 "이메일" = EXCLUDED."이메일",
                 "보안교육이수여부" = EXCLUDED."보안교육이수여부"`,
          [
            adminId,
            String(row['사번'] || ''),
            String(row['이름'] || ''),
            String(row['이메일'] || ''),
            String(row['보안교육이수여부'] || '미완료'),
          ]
        );
      }

      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      await client.query(
        `INSERT INTO settings (admin_id, employee_file_name, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (admin_id) DO UPDATE
           SET employee_file_name = EXCLUDED.employee_file_name, updated_at = NOW()`,
        [adminId, originalName]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ success: true, message: `${cleanRows.length}명 업로드 완료` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '업로드 실패' });
  }
});

// ─── 이수 현황 엑셀 다운로드 ────────────────────────
router.get('/download-employees', async (req, res) => {
  try {
    const { adminId } = req.query;

    const [empResult, resultResult] = await Promise.all([
      db.query('SELECT * FROM employees WHERE company_id = $1', [adminId]),
      db.query(
        `SELECT "사번", "응시일시" FROM quiz_results
         WHERE company_id = $1 AND "합격여부" = '합격'`,
        [adminId]
      ),
    ]);

    const resultMap = {};
    resultResult.rows.forEach(row => {
      resultMap[String(row['사번'])] = new Date(row['응시일시']).toLocaleString('ko-KR');
    });

    const rows = empResult.rows.map(row => ({
      사번: row['사번'],
      이름: row['이름'],
      이메일: row['이메일'],
      보안교육이수여부: row['보안교육이수여부'],
      이수일시: resultMap[String(row['사번'])] || '',
    }));

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

// ─── 테스트 이메일 발송 ──────────────────────────────
router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  try {
    await transporter.sendMail({
      from: `"한솔아이원스 보안교육" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '[한솔아이원스] 테스트 이메일입니다.',
      html: '<p>테스트 이메일 발송 성공! 🎉</p>',
    });
    res.json({ success: true, message: '테스트 이메일 발송 완료!' });
  } catch (err) {
    res.status(500).json({ success: false, message: '발송 실패: ' + err.message });
  }
});

// ─── 시스템 설정 불러오기 ───────────────────────────
router.get('/site-config', async (req, res) => {
  const { adminId } = req.query;
  try {
    const result = await db.query(
      'SELECT company_name, system_name FROM settings WHERE admin_id = $1',
      [adminId || 'siteConfig']
    );
    if (result.rows.length === 0) return res.json({ companyName: '', systemName: '' });
    const row = result.rows[0];
    res.json({ companyName: row.company_name, systemName: row.system_name });
  } catch (err) {
    res.status(500).json({ message: '설정 불러오기 실패' });
  }
});

// ─── 시스템 설정 저장 ────────────────────────────────
router.post('/site-config', async (req, res) => {
  const { adminId, systemName } = req.body;
  try {
    await db.query(
      `INSERT INTO settings (admin_id, system_name, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (admin_id) DO UPDATE
         SET system_name = EXCLUDED.system_name, updated_at = NOW()`,
      [adminId, systemName]
    );
    res.json({ message: '저장 완료' });
  } catch (err) {
    res.status(500).json({ message: '저장 실패' });
  }
});

// ─── 회사 목록 조회 (임직원 로그인 선택박스용) ──────
router.get('/companies', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.company_name, COALESCE(s.system_name, '') AS system_name
       FROM admins a
       LEFT JOIN settings s ON s.admin_id = a.id
       WHERE s.system_name IS NOT NULL
         AND s.system_name != ''
         AND s.system_name != '[교육 이름을 설정해주세요]'`
    );

    const companyMap = {};
    for (const row of result.rows) {
      if (!companyMap[row.company_name]) companyMap[row.company_name] = [];
      companyMap[row.company_name].push({ adminId: row.id, systemName: row.system_name });
    }

    const companies = Object.entries(companyMap).map(([companyName, educations]) => ({
      companyName,
      educations,
    }));

    res.json({ companies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '조회 실패' });
  }
});

// ─── 계정 생성 (슈퍼관리자만) ───────────────────────
router.post('/create-account', async (req, res) => {
  const { requesterId, newId, companyName, initialPassword } = req.body;
  console.log('requesterId:', requesterId, '| ADMIN_ID:', process.env.ADMIN_ID);
  if (requesterId !== process.env.ADMIN_ID) {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const existing = await db.query('SELECT id FROM admins WHERE id = $1', [newId]);
    if (existing.rows.length > 0) return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });

    const initPw = initialPassword || 'Hansol123!@#';
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO admins (id, password, company_name, must_change_password) VALUES ($1, $2, $3, TRUE)',
        [newId, initPw, companyName]
      );
      await client.query(
        `INSERT INTO settings (admin_id, company_name, system_name)
         VALUES ($1, $2, '[교육 이름을 설정해주세요]')
         ON CONFLICT (admin_id) DO NOTHING`,
        [newId, companyName]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: '계정 생성 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '계정 생성 실패' });
  }
});

// ─── 계정 목록 조회 (슈퍼관리자만) ─────────────────
router.get('/accounts', async (req, res) => {
  const { requesterId } = req.query;
  if (requesterId !== process.env.ADMIN_ID) {
    return res.status(403).json({ message: '권한이 없습니다.' });
  }
  try {
    const result = await db.query(
      'SELECT id, company_name, must_change_password FROM admins'
    );
    const accounts = result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      mustChangePassword: row.must_change_password || false,
    }));
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ message: '조회 실패' });
  }
});

// ─── 암호 변경 ───────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { adminId, currentPassword, newPassword } = req.body;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ message: '암호는 8자리 이상, 대문자/소문자/숫자/특수문자(!@#$%^&*)를 모두 포함해야 합니다.' });
  }
  try {
    const result = await db.query('SELECT password FROM admins WHERE id = $1', [adminId]);
    if (result.rows.length === 0 || result.rows[0].password !== currentPassword) {
      return res.status(401).json({ message: '현재 암호가 올바르지 않습니다.' });
    }
    await db.query(
      'UPDATE admins SET password = $1, must_change_password = FALSE WHERE id = $2',
      [newPassword, adminId]
    );
    res.json({ message: '암호 변경 완료' });
  } catch (err) {
    res.status(500).json({ message: '암호 변경 실패' });
  }
});

// ─── 암호 초기화 (슈퍼관리자만) ────────────────────
router.post('/reset-password', async (req, res) => {
  const { requesterId, targetId } = req.body;
  if (requesterId !== process.env.ADMIN_ID) return res.status(401).json({ message: '권한 없음' });
  try {
    await db.query(
      "UPDATE admins SET password = 'Hansol123!@#', must_change_password = TRUE WHERE id = $1",
      [targetId]
    );
    res.json({ message: '초기화 완료' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── 계정 삭제 (슈퍼관리자만) ───────────────────────
router.delete('/delete-account', async (req, res) => {
  const { requesterId, targetId } = req.body;
  if (requesterId !== process.env.ADMIN_ID) return res.status(403).json({ message: '권한 없음' });
  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM admins WHERE id = $1', [targetId]);
      await client.query('DELETE FROM settings WHERE admin_id = $1', [targetId]);
      await client.query('DELETE FROM youtube_settings WHERE admin_id = $1', [targetId]);
      await client.query('DELETE FROM quiz_settings WHERE admin_id = $1', [targetId]);

      // 교육자료 파일도 삭제
      const mat = await client.query('SELECT file_path FROM material_settings WHERE admin_id = $1', [targetId]);
      if (mat.rows.length > 0 && mat.rows[0].file_path) {
        try { fs.unlinkSync(mat.rows[0].file_path); } catch (_) {}
      }
      await client.query('DELETE FROM material_settings WHERE admin_id = $1', [targetId]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── 저장된 정보 요약 (관리자 대시보드용) ────────────
router.get('/saved-info', async (req, res) => {
  const { adminId } = req.query;
  try {
    const [matResult, ytResult, settingResult, quizResult] = await Promise.all([
      db.query('SELECT file_name FROM material_settings WHERE admin_id = $1', [adminId]),
      db.query('SELECT url FROM youtube_settings WHERE admin_id = $1', [adminId]),
      db.query('SELECT employee_file_name FROM settings WHERE admin_id = $1', [adminId]),
      db.query('SELECT questions, generated_at FROM quiz_settings WHERE admin_id = $1', [adminId]),
    ]);

    const quizRow = quizResult.rows[0];
    res.json({
      materialFileName: matResult.rows[0]?.file_name || '',
      youtubeUrl: ytResult.rows[0]?.url || '',
      employeeFileName: settingResult.rows[0]?.employee_file_name || '',
      quizTotal: quizRow ? (quizRow.questions?.length || 0) : 0,
      quizGeneratedAt: quizRow?.generated_at
        ? new Date(quizRow.generated_at).toLocaleDateString('ko-KR')
        : '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── 특정 계정 상세 정보 (슈퍼관리자용) ─────────────
router.get('/account-info', async (req, res) => {
  const { requesterId, targetId } = req.query;
  if (requesterId !== process.env.ADMIN_ID) return res.status(403).json({ message: '권한 없음' });
  try {
    const [settingResult, matResult, ytResult, quizResult] = await Promise.all([
      db.query('SELECT system_name, employee_file_name FROM settings WHERE admin_id = $1', [targetId]),
      db.query('SELECT file_name FROM material_settings WHERE admin_id = $1', [targetId]),
      db.query('SELECT url FROM youtube_settings WHERE admin_id = $1', [targetId]),
      db.query('SELECT questions, generated_at FROM quiz_settings WHERE admin_id = $1', [targetId]),
    ]);

    const quizRow = quizResult.rows[0];
    res.json({
      systemName: settingResult.rows[0]?.system_name || '',
      materialFileName: matResult.rows[0]?.file_name || '',
      youtubeUrl: ytResult.rows[0]?.url || '',
      employeeFileName: settingResult.rows[0]?.employee_file_name || '',
      quizTotal: quizRow ? (quizRow.questions?.length || 0) : 0,
      quizGeneratedAt: quizRow?.generated_at
        ? new Date(quizRow.generated_at).toLocaleDateString('ko-KR')
        : '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
