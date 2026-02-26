const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

// 유튜브 URL 가져오기
router.get('/youtube', async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const doc = await db.collection('settings').doc(companyId).collection('youtube').doc('main').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '등록된 유튜브 링크가 없습니다.' });
    }
    res.json({ success: true, url: doc.data().url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 교육자료 URL 가져오기
router.get('/material', async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const doc = await db.collection('settings').doc(companyId).collection('material').doc('main').get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '등록된 교육자료가 없습니다.' });
    }
    res.json({ success: true, fileUrl: doc.data().fileUrl, fileName: doc.data().fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;