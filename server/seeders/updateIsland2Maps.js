const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codequest',
}

async function main() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    const [result] = await connection.execute(
      `UPDATE lessons
       SET background_image = '/assets/lvl2.png'
       WHERE module_id = 2`
    )
    console.log(`Island 2 background updated: ${result.affectedRows} lessons -> /assets/lvl2.png`)
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Island 2 map update failed:', error.message)
  process.exitCode = 1
})