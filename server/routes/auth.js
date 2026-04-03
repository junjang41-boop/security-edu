const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.post('/verify', async (req, res) => {
  try {
    const { 사번, 이름, companyId } = req.body;

    const result = await db.query(
      'SELECT * FROM employees WHERE "사번" = $1 AND company_id = $2',
      [String(사번), companyId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '사번 또는 이름이 올바르지 않습니다.' });
    }

    const employee = result.rows[0];

    if (employee['이름'] !== 이름) {
      return res.status(401).json({ success: false, message: '사번 또는 이름이 올바르지 않습니다.' });
    }

    if (employee['보안교육이수여부'] === '완료') {
      return res.status(403).json({ success: false, message: '이미 교육 이수가 완료된 임직원입니다.' });
    }

    res.json({
      success: true,
      message: '인증 성공',
      employee: {
        사번: employee['사번'],
        이름: employee['이름'],
        이메일: employee['이메일'],
        companyId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
