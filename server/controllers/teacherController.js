const db = require('../config/db')

const safeQuery = async (query, params = []) => {
  try {
    return await db.query(query, params)
  } catch (error) {
    console.error('Database query error:', error.message)
    return [[], []]
  }
}

// ============================================================
// TEACHER DASHBOARD OVERVIEW
// ============================================================
exports.overview = async (req, res) => {
  try {
    const [[userStats]] = await safeQuery(`
      SELECT COUNT(*) AS total,
             SUM(last_login >= CURDATE() - INTERVAL 7 DAY) AS active
      FROM users
      WHERE role = 'student'
    `)

    const [[lessonStats]] = await safeQuery(`
      SELECT COUNT(*) AS total
      FROM lessons
      WHERE is_active = 1
    `)

    const [[progressStats]] = await safeQuery(`
      SELECT COUNT(DISTINCT user_id) AS students,
             SUM(phase = 'completed') AS completed,
             AVG(phase = 'completed') AS completion
      FROM student_progress
    `)

    const [recent] = await safeQuery(`
      SELECT u.id, u.name, u.section, u.xp, u.level,
             MAX(sp.completed_at) AS last_activity
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY last_activity DESC
      LIMIT 8
    `)

    const [modules] = await safeQuery(`
      SELECT m.id, m.title, m.color,
             COUNT(l.id) AS lessons,
             COALESCE(ROUND(100 * AVG(sp.phase = 'completed')), 0) AS completion
      FROM lesson_modules m
      LEFT JOIN lessons l ON l.module_id = m.id AND l.is_active = 1
      LEFT JOIN student_progress sp ON sp.lesson_id = l.id
      GROUP BY m.id
      ORDER BY m.order_index
    `)

    const [attention] = await safeQuery(`
      SELECT u.id, u.name, u.section, u.last_login,
             COALESCE(ROUND(100 * AVG(sp.phase = 'completed')), 0) AS progress,
             COUNT(CASE WHEN sp.attempts >= 3 THEN 1 END) AS struggles
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id
      HAVING progress < 40
          OR u.last_login IS NULL
          OR u.last_login < CURDATE() - INTERVAL 7 DAY
          OR struggles > 0
      ORDER BY progress
      LIMIT 8
    `)

    res.json({
      stats: {
        totalStudents: userStats?.total || 0,
        activeStudents: userStats?.active || 0,
        averageProgress: Math.round((progressStats?.completion || 0) * 100),
        completedLessons: progressStats?.completed || 0,
        totalLessons: lessonStats?.total || 0
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
      SELECT u.id, u.name, u.email, u.section, u.xp, u.level,
             u.streak, u.last_login,
             COUNT(DISTINCT sp.lesson_id) AS attempted,
             COALESCE(SUM(sp.phase = 'completed'), 0) AS completed,
             COALESCE(ROUND(100 * AVG(sp.phase = 'completed')), 0) AS progress,
             COALESCE(SUM(sp.attempts), 0) AS attempts
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id
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
      SELECT id, name, email, section, xp, level, streak,
             last_login, created_at
      FROM users
      WHERE id = ? AND role = 'student'
    `, [id])

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    const [lessons] = await safeQuery(`
      SELECT l.id, l.title, l.level_label,
             m.title AS module,
             sp.phase, sp.attempts, sp.completed_at
      FROM lessons l
      LEFT JOIN lesson_modules m ON m.id = l.module_id
      LEFT JOIN student_progress sp
        ON sp.lesson_id = l.id AND sp.user_id = ?
      WHERE l.is_active = 1
      ORDER BY m.order_index, l.order_index
    `, [id])

    const [assessments] = await safeQuery(`
      SELECT q.title, q.type, r.score, r.total, r.taken_at
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
    const [modules] = await safeQuery(`
      SELECT m.title,
             COALESCE(ROUND(100 * AVG(sp.phase = 'completed')), 0) AS completion,
             COALESCE(ROUND(AVG(sp.attempts), 1), 0) AS attempts
      FROM lesson_modules m
      LEFT JOIN lessons l ON l.module_id = m.id
      LEFT JOIN student_progress sp ON sp.lesson_id = l.id
      GROUP BY m.id
      ORDER BY m.order_index
    `)

    const [scores] = await safeQuery(`
      SELECT q.type,
             ROUND(AVG(100 * r.score / NULLIF(r.total, 0))) AS average,
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
      ORDER BY xp DESC, level DESC
      LIMIT 50
    `)

    res.json(rows)
  } catch (error) {
    console.error('Teacher leaderboard error:', error)
    res.status(500).json({ message: 'Unable to load leaderboard.' })
  }
}