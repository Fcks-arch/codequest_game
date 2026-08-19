const express  = require('express')
const router   = express.Router()
const { authMiddleware, instructorOnly } = require('../middleware/auth')
const auth     = require('../controllers/authController')
const lessons  = require('../controllers/lessonController')
const progress = require('../controllers/progressController')

// ── AUTH ──
router.post('/auth/register', auth.register)
router.post('/auth/login',    auth.login)
router.post('/auth/google',   auth.googleAuth)
router.post('/auth/forgot-password', auth.forgotPassword)
router.post('/auth/reset-password',  auth.resetPassword)
router.get('/auth/me',        authMiddleware, auth.getMe)
router.get('/auth/profile',   authMiddleware, auth.getProfile)
router.put('/auth/profile',   authMiddleware, auth.updateProfile)

// ── LESSONS ──
router.get('/lessons',        authMiddleware, lessons.getLessons)
router.get('/lessons/modules', authMiddleware, lessons.getModules)
router.get('/lessons/:id/next', authMiddleware, lessons.getNextLesson)
router.get('/lessons/:id',    authMiddleware, lessons.getLesson)
router.post('/lessons',       authMiddleware, instructorOnly, lessons.createLesson)
router.put('/lessons/:id',    authMiddleware, instructorOnly, lessons.updateLesson)

// ── PROGRESS + GAMIFICATION ──
router.get('/progress',              authMiddleware, progress.getProgress)
router.post('/progress/complete',    authMiddleware, progress.completeLesson)
router.get('/progress/badges',       authMiddleware, progress.getBadges)
router.get('/progress/leaderboard',  authMiddleware, progress.getLeaderboard)

// ── PRE-TEST ──
router.post('/progress/pretest',     authMiddleware, progress.savePretest)
router.get('/progress/pretest',      authMiddleware, progress.getPretestResult)

module.exports = router
