const express = require('express');
const router = express.Router();
const { db } = require('../db');

// 유튜브 URL 가져오기
router.get('/youtube', async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await db.query(
      'SELECT url FROM youtube_settings WHERE admin_id = $1',
      [companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '등록된 유튜브 링크가 없습니다.' });
    }
    res.json({ success: true, url: result.rows[0].url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 교육자료 정보 가져오기
router.get('/material', async (req, res) => {
  try {
    const { companyId } = req.query;
    const result = await db.query(
      'SELECT file_name, file_path FROM material_settings WHERE admin_id = $1',
      [companyId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '등록된 교육자료가 없습니다.' });
    }
    const row = result.rows[0];
    // file_path를 공개 URL로 변환 (/uploads/materials/xxx.pdf → 정적 서빙 경로)
    const fileUrl = `/uploads/${row.file_path.replace(/^.*\/uploads\//, '')}`;
    res.json({ success: true, fileUrl, fileName: row.file_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
