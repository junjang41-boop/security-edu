const { db } = require('./firebase');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
console.log('ADMIN_ID:', process.env.ADMIN_ID);
console.log('환경변수 확인 완료');

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const educationRoutes = require('./routes/education');
const quizRoutes = require('./routes/quiz');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/', (req, res) => {
  res.json({ message: '보안교육 플랫폼 서버 정상 작동 중 ✅' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});