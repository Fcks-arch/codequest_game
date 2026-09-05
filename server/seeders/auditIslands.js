require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'codequest',
    multipleStatements: true
  })

  try {
    const migration = fs.readFileSync(path.join(__dirname, '../../audit-islands-1-3-platformer.sql'), 'utf8')
    await db.query(migration)

    const [rows] = await db.query(`
      SELECT l.module_id, COUNT(DISTINCT l.id) AS lessons, COUNT(gs.id) AS guided_steps
      FROM lessons l
      LEFT JOIN guided_steps gs ON gs.lesson_id = l.id
      WHERE l.module_id IN (1, 2, 3)
      GROUP BY l.module_id
      ORDER BY l.module_id
    `)
    const [legacy] = await db.query(`
      SELECT COUNT(*) AS total
      FROM guided_steps gs
      JOIN lessons l ON l.id = gs.lesson_id
      WHERE l.module_id IN (1, 2, 3)
        AND (CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%System.out%'
        OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%turnLeft%'
        OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%turnRight%'
        OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%moveLeft%'
        OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%stop(%')
    `)
    if (Number(legacy[0].total) > 0) {
      const [legacyRows] = await db.query(`
        SELECT gs.lesson_id, gs.step_order, gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3
        FROM guided_steps gs
        JOIN lessons l ON l.id = gs.lesson_id
        WHERE l.module_id IN (1, 2, 3)
          AND (CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%System.out%'
            OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%turnLeft%'
            OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%turnRight%'
            OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%moveLeft%'
            OR CONCAT_WS(' ', gs.correct_snippet, gs.distractor_1, gs.distractor_2, gs.distractor_3) LIKE '%stop(%')
      `)
      console.log('Legacy rows:', JSON.stringify(legacyRows))
    }

    console.log('Island 1-3 totals:', JSON.stringify(rows))
    console.log('Legacy unsupported snippets:', legacy[0].total)
    if (rows.length !== 3 || rows.some(row => Number(row.lessons) !== 10 || Number(row.guided_steps) !== 10) || Number(legacy[0].total) !== 0) {
      process.exitCode = 1
    }
  } finally {
    await db.end()
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
