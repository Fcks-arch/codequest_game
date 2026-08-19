require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const routes  = require('./routes')

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api', routes)

app.get('/', (req, res) => res.json({ message: 'CodeQuest API is running.' }))

app.listen(PORT, () => console.log(`CodeQuest server running on http://localhost:${PORT}`))
