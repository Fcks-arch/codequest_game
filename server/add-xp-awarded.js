// Adds the missing student_progress.xp_awarded column (safe to run more than once).
// Usage (from the server folder):  node add-xp-awarded.js
const path = require('path');
try { require('dotenv').config({ path: path.resolve(__dirname, '.env') }); } catch (e) {}
try { require('dotenv').config(); } catch (e) {}
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  const [cols] = await conn.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_progress' AND COLUMN_NAME = 'xp_awarded'`
  );
  if (Number(cols[0].n) > 0) {
    console.log('xp_awarded already exists in', process.env.DB_NAME, '- nothing to do.');
  } else {
    await conn.query('ALTER TABLE student_progress ADD COLUMN xp_awarded TINYINT(1) NOT NULL DEFAULT 0');
    // Rows that were already completed earned their XP under the old code: mark them
    // so students are not paid the same lesson twice.
    const [res] = await conn.query('UPDATE student_progress SET xp_awarded = 1 WHERE completed_at IS NOT NULL');
    console.log(`Added xp_awarded to ${process.env.DB_NAME}.student_progress; marked ${res.affectedRows} already-completed row(s).`);
  }

  const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM student_progress');
  console.log('student_progress rows:', total);
  await conn.end();
})().catch(err => { console.error('Failed:', err.message); process.exit(1); });
