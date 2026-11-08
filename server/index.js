require('dotenv').config()
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 5000

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({
  origin: [
    clientOrigin,
    'http://localhost:5173',
    'http://localhost',
    'https://localhost'
  ],
  credentials: true
}))
app.use(express.json())

// HTTP request logging
app.use((req, res, next) => {
  logger.info('HTTP_REQUEST', {
    method: req.method,
    path: req.path
  })

  next()
})

// API status route
app.get('/', (req, res) => {
  res.json({ message: 'CodeQuest API is running.' })
})

// API routes
app.use('/api', routes)

// Error handler must be last
app.use(errorHandler)

app.listen(PORT, '0.0.0.0', () => {
  logger.info('SERVER_STARTED', { port: PORT, host: '0.0.0.0' })
})