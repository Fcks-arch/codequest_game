const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const crypto = require('crypto')
const db     = require('../config/db')
const { OAuth2Client } = require('google-auth-library')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password, role, section } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email, and password are required.' })

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0)
      return res.status(409).json({ message: 'Email already registered.' })

    const hashed = await bcrypt.hash(password, 10)
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, section) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, role || 'student', section || null]
    )

    const token = jwt.sign(
      { id: result.insertId, name, role: role || 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user: { id: result.insertId, name, email, role: role || 'student', section } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error during registration.' })
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' })

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid email or password.' })

    const user = rows[0]
    if (!user.password)
      return res.status(401).json({ message: 'This account uses Google Sign-In. Please log in with Google.' })

    const match = await bcrypt.compare(password, user.password)
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password.' })

    // Update last login and streak
    await db.query('UPDATE users SET last_login = CURDATE() WHERE id = ?', [user.id])

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, section: user.section,
        xp: user.xp, level: user.level, streak: user.streak
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error during login.' })
  }
}

// POST /api/auth/google
async function googleAuth(req, res) {
  const { credential } = req.body
  if (!credential)
    return res.status(400).json({ message: 'Missing Google credential.' })

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    let [rows] = await db.query('SELECT * FROM users WHERE email = ? OR google_id = ?', [payload.email, payload.sub])
    let user

    if (rows.length === 0) {
      // New account — created via Google, no local password
      const [result] = await db.query(
        'INSERT INTO users (name, email, password, google_id, role) VALUES (?, ?, NULL, ?, ?)',
        [payload.name, payload.email, payload.sub, 'student']
      )
      const [created] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId])
      user = created[0]
    } else {
      user = rows[0]
      if (!user.google_id) {
        // Existing password account signing in with Google for the first time — link it
        await db.query('UPDATE users SET google_id = ? WHERE id = ?', [payload.sub, user.id])
      }
    }

    await db.query('UPDATE users SET last_login = CURDATE() WHERE id = ?', [user.id])

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, section: user.section,
        xp: user.xp, level: user.level, streak: user.streak
      }
    })
  } catch (err) {
    console.error(err)
    res.status(401).json({ message: 'Google sign-in failed.' })
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, section, xp, level, streak, nametag, bio, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error.' })
  }
}

async function getProfile(req, res) {
  return getMe(req, res)
}

async function updateProfile(req, res) {
  const { name, email, section, nametag, bio, avatar_url } = req.body
  const userId = req.user.id

  try {
    const updates = []
    const values = []

    if (typeof name !== 'undefined') {
      const trimmedName = String(name || '').trim()
      if (!trimmedName) return res.status(400).json({ message: 'Name cannot be empty.' })
      updates.push('name = ?')
      values.push(trimmedName)
    }

    if (typeof email !== 'undefined') {
      const trimmedEmail = String(email || '').trim()
      if (!trimmedEmail) return res.status(400).json({ message: 'Email cannot be empty.' })
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [trimmedEmail, userId])
      if (existing.length > 0) return res.status(409).json({ message: 'That email is already in use.' })
      updates.push('email = ?')
      values.push(trimmedEmail)
    }

    if (typeof section !== 'undefined') {
      updates.push('section = ?')
      values.push(section ? String(section).trim() : null)
    }

    if (typeof nametag !== 'undefined') {
      updates.push('nametag = ?')
      values.push(nametag ? String(nametag).trim() : null)
    }

    if (typeof bio !== 'undefined') {
      updates.push('bio = ?')
      values.push(bio ? String(bio).trim() : null)
    }

    if (typeof avatar_url !== 'undefined') {
      updates.push('avatar_url = ?')
      values.push(avatar_url ? String(avatar_url).trim() : null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No profile changes provided.' })
    }

    values.push(userId)
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)

    const [rows] = await db.query(
      'SELECT id, name, email, role, section, xp, level, streak, nametag, bio, avatar_url FROM users WHERE id = ?',
      [userId]
    )

    res.json({ message: 'Profile updated successfully.', user: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error while updating profile.' })
  }
}

// POST /api/auth/forgot-password
// NOTE: no email service is wired up yet — the reset link is returned directly
// in the response so the frontend can display it. Swap this for a real email
// send (nodemailer, etc.) later without changing the frontend contract.
async function forgotPassword(req, res) {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required.' })

  try {
    const [rows] = await db.query('SELECT id, google_id FROM users WHERE email = ?', [email])

    // Always respond the same way whether or not the account exists,
    // so the form can't be used to check which emails are registered.
    if (rows.length === 0) {
      return res.json({ message: 'If that email is registered, a reset link has been created.' })
    }

    const user = rows[0]
    if (user.google_id) {
      // Google-only accounts don't have a local password to reset
      return res.status(400).json({ message: 'This account uses Google Sign-In. Please log in with Google instead.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id])

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    const resetLink = `${clientOrigin}/reset-password?token=${token}`

    res.json({ message: 'Reset link created.', resetLink })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error while creating reset link.' })
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  const { token, password } = req.body
  if (!token || !password)
    return res.status(400).json({ message: 'Token and new password are required.' })
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' })

  try {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    )
    if (rows.length === 0)
      return res.status(400).json({ message: 'This reset link is invalid or has expired.' })

    const hashed = await bcrypt.hash(password, 10)
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashed, rows[0].id]
    )

    res.json({ message: 'Password updated. You can now log in.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error while resetting password.' })
  }
}

module.exports = { register, login, googleAuth, forgotPassword, resetPassword, getMe, getProfile, updateProfile }
