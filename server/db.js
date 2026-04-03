const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ionesdb',
  user: process.env.DB_USER || 'iones',
  password: process.env.DB_PASSWORD || 'Hansoliones1!',
});

pool.on('connect', () => {
  console.log('PostgreSQL 연결 성공');
});

pool.on('error', (err) => {
  console.error('PostgreSQL 연결 오류:', err);
});

module.exports = { db: pool };
