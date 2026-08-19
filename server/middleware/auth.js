const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header) return res.status(401).json({ message: 'No token provided.' })

  const token = header.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Token missing.' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' })
  }
}

function instructorOnly(req, res, next) {
  if (req.user.role !== 'instructor') {
    return res.status(403).json({ message: 'Instructor access only.' })
  }
  next()
}

module.exports = { authMiddleware, instructorOnly }
