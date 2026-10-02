const fs = require('fs')
const mysql = require('mysql2/promise')

async function main() {
  const c = await mysql.createConnection({
    host: process.env.CLOUD_DB_HOST,
    port: Number(process.env.CLOUD_DB_PORT),
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME || 'codequest',
    ssl: { rejectUnauthorized: false },
    dateStrings: true,
  })

  const lit = v =>
    v !== null && typeof v === 'object' && !Buffer.isBuffer(v)
      ? c.escape(JSON.stringify(v))
      : c.escape(v)

  const fix = sql => sql
    .replace(/utf8mb4_0900_ai_ci/g, 'utf8mb4_general_ci')
    .replace(/utf8mb4_0900_bin/g, 'utf8mb4_bin')

  const out = ['SET NAMES utf8mb4;', 'SET FOREIGN_KEY_CHECKS=0;']
  const [tables] = await c.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")

  for (const row of tables) {
    const table = Object.values(row)[0]
    const [[create]] = await c.query(`SHOW CREATE TABLE \`${table}\``)
    const [rows] = await c.query(`SELECT * FROM \`${table}\``)
    out.push(`DROP TABLE IF EXISTS \`${table}\`;`, fix(create['Create Table']) + ';')
    for (let i = 0; i < rows.length; i += 50) {
      const cols = Object.keys(rows[i]).map(k => `\`${k}\``).join(', ')
      const values = rows.slice(i, i + 50)
        .map(r => '(' + Object.values(r).map(lit).join(', ') + ')')
        .join(',\n')
      out.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n${values};`)
    }
    console.log(table, rows.length)
  }

  out.push('SET FOREIGN_KEY_CHECKS=1;')
  fs.writeFileSync('C:/db_backup/aiven_codequest.sql', out.join('\n'), 'utf8')
  await c.end()
  console.log('Saved C:/db_backup/aiven_codequest.sql')
}

main().catch(e => { console.error(e.message); process.exit(1) })