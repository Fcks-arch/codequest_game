const db = require('../config/db')

// ============================================================
// SAFE DATABASE QUERY
// ============================================================

const safeQuery = async (query, params = []) => {
  try {
    return await db.query(query, params)
  } catch (error) {
    console.error('Database query error:', error.message)
    return [[], []]
  }
}

// ============================================================
// SHARED SQL FRAGMENTS
// ============================================================

// Per-student progress % = completed active lessons / total active lessons * 100
const PROGRESS_EXPR = `
  COALESCE(
    ROUND(
      (
        COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END)
        / NULLIF((SELECT COUNT(*) FROM lessons WHERE is_active = 1), 0)
      ) * 100
    ),
    0
  )
`

// Per-module completion % = completed (student, lesson) pairs / (lessons in module * total students) * 100
const MODULE_COMPLETION_EXPR = `
  COALESCE(
    ROUND(
      (
        COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN CONCAT(sp.user_id, '-', sp.lesson_id) END)
        / NULLIF(COUNT(DISTINCT l.id) * (SELECT COUNT(*) FROM users WHERE role = 'student'), 0)
      ) * 100
    ),
    0
  )
`

// ============================================================
// HELPERS
// ============================================================

const getTotalLessons = async () => {
  const [[result]] = await safeQuery(`
    SELECT COUNT(*) AS total FROM lessons WHERE is_active = 1
  `)
  return Number(result?.total) || 0
}

// Shared module stats, used by both overview() and analytics()
const getModuleStats = async () => {
  const [rows] = await safeQuery(`
    SELECT
      m.id,
      m.title,
      m.color,
      COUNT(DISTINCT l.id) AS lessons,
      ${MODULE_COMPLETION_EXPR} AS completion,
      COALESCE(ROUND(AVG(sp.attempts), 1), 0) AS attempts
    FROM lesson_modules m
    LEFT JOIN lessons l ON l.module_id = m.id AND l.is_active = 1
    LEFT JOIN student_progress sp ON sp.lesson_id = l.id
    GROUP BY m.id, m.title, m.color, m.order_index
    ORDER BY m.order_index
  `)
  return rows
}

// ============================================================
// TEACHER DASHBOARD OVERVIEW
// ============================================================

exports.overview = async (req, res) => {
  try {
    const [[userStats]] = await safeQuery(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(last_login >= CURDATE() - INTERVAL 7 DAY), 0) AS active
      FROM users
      WHERE role = 'student'
    `)

    const totalLessons = await getTotalLessons()

    const [[completedStats]] = await safeQuery(`
      SELECT COUNT(DISTINCT sp.id) AS completed
      FROM student_progress sp
      JOIN lessons l ON l.id = sp.lesson_id
      WHERE sp.phase = 'completed' AND l.is_active = 1
    `)

    const [[averageStats]] = await safeQuery(`
      SELECT
        COALESCE(
          ROUND(
            AVG(
              COALESCE(student_completed.completed, 0)
              / NULLIF((SELECT COUNT(*) FROM lessons WHERE is_active = 1), 0)
              * 100
            )
          ),
          0
        ) AS averageProgress
      FROM users u
      LEFT JOIN (
        SELECT sp.user_id, COUNT(DISTINCT sp.lesson_id) AS completed
        FROM student_progress sp
        JOIN lessons l ON l.id = sp.lesson_id
        WHERE sp.phase = 'completed' AND l.is_active = 1
        GROUP BY sp.user_id
      ) AS student_completed ON student_completed.user_id = u.id
      WHERE u.role = 'student'
    `)

    const [recent] = await safeQuery(`
      SELECT u.id, u.name, u.section, u.xp, u.level, MAX(sp.completed_at) AS last_activity
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.section, u.xp, u.level
      ORDER BY last_activity DESC
      LIMIT 8
    `)

    const moduleStats = await getModuleStats()
    const modules = moduleStats.map(({ id, title, color, lessons, completion }) => ({
      id, title, color, lessons, completion
    }))

    const [attention] = await safeQuery(`
      SELECT
        u.id,
        u.name,
        u.section,
        u.last_login,
        ${PROGRESS_EXPR} AS progress,
        COUNT(CASE WHEN sp.attempts >= 3 THEN 1 END) AS struggles
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.section, u.last_login
      HAVING
        progress < 40
        OR u.last_login IS NULL
        OR u.last_login < CURDATE() - INTERVAL 7 DAY
        OR struggles > 0
      ORDER BY progress ASC
      LIMIT 8
    `)

    res.json({
      stats: {
        totalStudents: Number(userStats?.total) || 0,
        activeStudents: Number(userStats?.active) || 0,
        averageProgress: Number(averageStats?.averageProgress) || 0,
        completedLessons: Number(completedStats?.completed) || 0,
        totalLessons
      },
      recent,
      modules,
      attention
    })
  } catch (error) {
    console.error('Teacher overview error:', error)
    res.status(500).json({ message: 'Unable to load teacher dashboard.' })
  }
}

// ============================================================
// GET ALL STUDENTS
// ============================================================

exports.students = async (req, res) => {
  try {
    const [rows] = await safeQuery(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.section,
        u.xp,
        u.level,
        u.streak,
        u.last_login,
        COUNT(DISTINCT sp.lesson_id) AS attempted,
        COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END) AS completed,
        ${PROGRESS_EXPR} AS progress,
        COALESCE(SUM(sp.attempts), 0) AS attempts
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email, u.section, u.xp, u.level, u.streak, u.last_login
      ORDER BY u.name
    `)

    res.json(rows)
  } catch (error) {
    console.error('Teacher students error:', error)
    res.status(500).json({ message: 'Unable to load students.' })
  }
}

// ============================================================
// GET SINGLE STUDENT
// ============================================================

exports.student = async (req, res) => {
  try {
    const { id } = req.params

    const [[student]] = await safeQuery(`
      SELECT id, name, email, section, xp, level, streak, last_login, created_at
      FROM users
      WHERE id = ? AND role = 'student'
    `, [id])

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    // LEFT JOIN ensures lessons that have not been started still appear.
    const [lessons] = await safeQuery(`
      SELECT l.id, l.title, l.level_label, m.title AS module, sp.phase, sp.attempts, sp.completed_at
      FROM lessons l
      LEFT JOIN lesson_modules m ON m.id = l.module_id
      LEFT JOIN student_progress sp ON sp.lesson_id = l.id AND sp.user_id = ?
      WHERE l.is_active = 1
      ORDER BY m.order_index, l.order_index
    `, [id])

    const [assessments] = await safeQuery(`
      SELECT r.id, q.title, q.type, r.score, r.total, r.taken_at
      FROM quiz_results r
      JOIN quizzes q ON q.id = r.quiz_id
      WHERE r.user_id = ?
      ORDER BY r.taken_at DESC
    `, [id])

    res.json({ student, lessons, assessments })
  } catch (error) {
    console.error('Teacher student details error:', error)
    res.status(500).json({ message: 'Unable to load student details.' })
  }
}

// ============================================================
// ANALYTICS
// ============================================================

exports.analytics = async (req, res) => {
  try {
    const moduleStats = await getModuleStats()
    const modules = moduleStats.map(({ id, title, completion, attempts }) => ({
      id, title, completion, attempts
    }))

    const [scores] = await safeQuery(`
      SELECT
        q.type,
        COALESCE(ROUND(AVG(100 * r.score / NULLIF(r.total, 0))), 0) AS average,
        COUNT(*) AS attempts
      FROM quiz_results r
      JOIN quizzes q ON q.id = r.quiz_id
      GROUP BY q.type
    `)

    res.json({ modules, scores })
  } catch (error) {
    console.error('Teacher analytics error:', error)
    res.status(500).json({ message: 'Unable to load analytics.' })
  }
}

// ============================================================
// LEADERBOARD
// ============================================================

exports.leaderboard = async (req, res) => {
  try {
    const [rows] = await safeQuery(`
      SELECT id, name, section, xp, level, streak
      FROM users
      WHERE role = 'student'
      ORDER BY xp DESC, level DESC, name ASC
      LIMIT 50
    `)

    res.json(rows)
  } catch (error) {
    console.error('Teacher leaderboard error:', error)
    res.status(500).json({ message: 'Unable to load leaderboard.' })
  }
}









import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import QuestNav from '../components/QuestNav'
import { Ico } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import { completedLessonIds, countTotalActivities, findNextActivity } from '../utils/questProgress'

const EMPTY_MODULES = []

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState(EMPTY_MODULES)
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(!!user)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([axios.get('/api/lessons/modules'), axios.get('/api/progress')])
      .then(([moduleResponse, progressResponse]) => {
        setModules(moduleResponse.data)
        setProgress(progressResponse.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const completedIds = useMemo(() => completedLessonIds(progress), [progress])
  const totalActivities = useMemo(() => countTotalActivities(modules), [modules])

  const beginQuest = useCallback(() => {
    navigate('/quest')
  }, [navigate])

  useEffect(() => {
    const start = event => {
      if (event.key !== 'Enter') return
      if (user) beginQuest()
      else navigate('/login')
    }
    window.addEventListener('keydown', start)
    return () => window.removeEventListener('keydown', start)
  }, [beginQuest, navigate, user])

  if (user) {
    return (
      <main className="landing-page">
        <div className="landing-scene" aria-hidden="true">
          <img className="landing-scene__bg" src="/assets/background.png" alt="" />
          <div className="landing-scene__veil" />
        </div>

        <QuestNav />

        <section className="landing-hero">
          <div className="landing-pip" role="img" aria-label="Pip the knight" />

          <p className="landing-eyebrow">Welcome back, {user.name?.split(' ')[0] || 'knight'}</p>
          <h1>Learn Java.<br /><em>Conquer the Realm.</em></h1>
          <p className="landing-copy">
            {user.section || 'BSIT'} · Level {user.level || 1} · {completedIds.size} of {totalActivities || '—'} activities cleared.
            Pick up where you left off and guide Pip with real Java.
          </p>
          <button type="button" className="landing-cta" onClick={beginQuest} disabled={loading}>
            <Ico n="play" s={18} c="#2b1a0e" />
            {loading ? 'Preparing your quest…' : 'Begin Your Quest'}
          </button>
          <p className="landing-hint">Press Enter to continue your quest</p>
        </section>

        <section className="landing-steps">
          <article className="landing-scroll">
            <b>I</b>
            <h2>Choose an island</h2>
            <p>Each island holds a lesson in your syllabus — chart your course across the map.</p>
          </article>
          <article className="landing-scroll">
            <b>II</b>
            <h2>Clear the trials</h2>
            <p>Every island holds playable coding activities and challenges to overcome.</p>
          </article>
          <article className="landing-scroll">
            <b>III</b>
            <h2>Earn your glory</h2>
            <p>Gain XP, unlock the next realm, and watch Pip reach the castle flag.</p>
          </article>
        </section>

        <footer className="landing-footer">
          <span>ISPSC Tagudin · BSIT</span>
        </footer>
      </main>
    )
  }

  return (
    <main className="landing-page">
      <div className="landing-scene" aria-hidden="true">
        <img className="landing-scene__bg" src="/assets/background.png" alt="" />
        <div className="landing-scene__veil" />
      </div>

      <nav className="landing-nav">
        <Link to="/" className="brand brand--medieval">
          <span className="brand__shield" aria-hidden="true">⚔</span>
          CodeQuest
        </Link>
        <Link to="/login" className="landing-login">Enter the Gate</Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-pip" role="img" aria-label="Pip the knight" />

        <p className="landing-eyebrow">A Knight&apos;s Quest in Code</p>
        <h1>Learn JavaScript.<br /><em>Conquer the Realm.</em></h1>
        <p className="landing-copy">
          CodeQuest turns programming lessons into a grand adventure — explore islands,
          clear coding challenges, and guide Pip the knight with real JavaScript.
        </p>
        <Link to="/login" className="landing-cta">
          <Ico n="play" s={18} c="#2b1a0e" />
          Begin Your Quest
        </Link>
        <p className="landing-hint">Press Enter to start</p>
      </section>

      <section className="landing-steps">
        <article className="landing-scroll">
          <b>I</b>
          <h2>Choose an island</h2>
          <p>Each island holds a lesson in your syllabus — chart your course across the map.</p>
        </article>
        <article className="landing-scroll">
          <b>II</b>
          <h2>Clear the trials</h2>
          <p>Every island holds playable coding activities and challenges to overcome.</p>
        </article>
        <article className="landing-scroll">
          <b>III</b>
          <h2>Earn your glory</h2>
          <p>Gain XP, unlock the next realm, and watch Pip reach the castle flag.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <span>ISPSC Tagudin · BSIT</span>
      </footer>
    </main>
  )
}
