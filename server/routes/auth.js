const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// 임직원 인증
router.post('/verify', async (req, res) => {
  try {
    const { 사번, 이름 } = req.body;

    // Firestore에서 사번으로 조회
    const docRef = db.collection('employees').doc(String(사번));
    const doc = await docRef.get();

    // 사번이 없는 경우
    if (!doc.exists) {
      return res.status(401).json({
        success: false,
        message: '사번 또는 이름이 올바르지 않습니다.',
      });
    }

    const employee = doc.data();

    // 이름이 다른 경우
    if (employee.이름 !== 이름) {
      return res.status(401).json({
        success: false,
        message: '사번 또는 이름이 올바르지 않습니다.',
      });
    }

    // 이미 이수 완료한 경우
    if (employee.보안교육이수여부 === '완료') {
      return res.status(403).json({
        success: false,
        message: '이미 보안교육 이수가 완료된 임직원입니다.',
      });
    }

    // 인증 성공
    res.json({
      success: true,
      message: '인증 성공',
      employee: {
        사번: employee.사번,
        이름: employee.이름,
        이메일: employee.이메일,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;