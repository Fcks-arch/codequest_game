const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'codequest',
  ssl: process.env.DB_SSL === 'true'
    ? { ca: fs.readFileSync(path.join(__dirname, 'aiven-ca.pem')) }
    : undefined,
  waitForConnections: true,
  connectionLimit: 10
})

module.exports = pool