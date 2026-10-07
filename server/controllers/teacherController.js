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
// CLASS SCOPING
// ============================================================

// Returns the class IDs this teacher owns. If ?class_id= is sent, narrows
// to that one class, and returns [] if the teacher doesn't own it.
const resolveClassIds = async (teacherId, classId) => {
  const [rows] = await safeQuery(
    'SELECT id FROM classes WHERE teacher_id = ?',
    [teacherId]
  )
  const ids = rows.map((row) => Number(row.id))

  if (classId !== undefined && classId !== null && classId !== '' && classId !== 'all') {
    return ids.includes(Number(classId)) ? [Number(classId)] : []
  }

  return ids
}

// Every query below that uses these fragments takes ONE `ids` array per "?".
const IN_CLASS = `
  u.id IN (
    SELECT cs.student_id FROM class_students cs WHERE cs.class_id IN (?)
  )
`

const CLASS_IDS_COL = `
  (
    SELECT GROUP_CONCAT(cs2.class_id)
    FROM class_students cs2
    WHERE cs2.student_id = u.id AND cs2.class_id IN (?)
  ) AS class_ids
`

// Turns "3,5" into [3, 5] so the front end gets a real array.
const withClassIds = (rows) =>
  rows.map((row) => ({
    ...row,
    class_ids: row.class_ids
      ? String(row.class_ids).split(',').map(Number)
      : []
  }))

// ============================================================
// SHARED SQL FRAGMENTS
// ============================================================

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

// Denominator is now "students in the selected classes", not all students.
const MODULE_COMPLETION_EXPR = `
  COALESCE(
    ROUND(
      (
        COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN CONCAT(sp.user_id, '-', sp.lesson_id) END)
        / NULLIF(
            COUNT(DISTINCT l.id) * (
              SELECT COUNT(DISTINCT student_id) FROM class_students WHERE class_id IN (?)
            ),
            0
          )
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

// Param order follows the SQL text: select-list "?" first, then the join "?".
const getModuleStats = async (ids) => {
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
    LEFT JOIN student_progress sp
      ON sp.lesson_id = l.id
     AND sp.user_id IN (
       SELECT student_id FROM class_students WHERE class_id IN (?)
     )
    GROUP BY m.id, m.title, m.color, m.order_index
    ORDER BY m.order_index
  `, [ids, ids])
  return rows
}

// ============================================================
// TEACHER DASHBOARD OVERVIEW
// ============================================================

exports.overview = async (req, res) => {
  try {
    const ids = await resolveClassIds(req.user.id, req.query.class_id)
    const totalLessons = await getTotalLessons()

    if (!ids.length) {
      return res.json({
        stats: {
          totalStudents: 0,
          activeStudents: 0,
          averageProgress: 0,
          completedLessons: 0,
          totalLessons
        },
        recent: [],
        modules: [],
        attention: []
      })
    }

    const [[userStats]] = await safeQuery(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(u.last_login >= CURDATE() - INTERVAL 7 DAY), 0) AS active
      FROM users u
      WHERE u.role = 'student' AND ${IN_CLASS}
    `, [ids])

    const [[completedStats]] = await safeQuery(`
      SELECT COUNT(DISTINCT sp.id) AS completed
      FROM student_progress sp
      JOIN lessons l ON l.id = sp.lesson_id
      JOIN users u ON u.id = sp.user_id
      WHERE sp.phase = 'completed' AND l.is_active = 1
        AND u.role = 'student' AND ${IN_CLASS}
    `, [ids])

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
      WHERE u.role = 'student' AND ${IN_CLASS}
    `, [ids])

    // select-list "?" comes before the WHERE "?"
    const [recent] = await safeQuery(`
      SELECT u.id, u.name, u.section, u.xp, u.level,
             MAX(sp.completed_at) AS last_activity,
             ${CLASS_IDS_COL}
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND ${IN_CLASS}
      GROUP BY u.id, u.name, u.section, u.xp, u.level
      ORDER BY last_activity DESC
      LIMIT 8
    `, [ids, ids])

    const moduleStats = await getModuleStats(ids)
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
        COUNT(CASE WHEN sp.attempts >= 3 THEN 1 END) AS struggles,
        ${CLASS_IDS_COL}
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND ${IN_CLASS}
      GROUP BY u.id, u.name, u.section, u.last_login
      HAVING
        progress < 40
        OR u.last_login IS NULL
        OR u.last_login < CURDATE() - INTERVAL 7 DAY
        OR struggles > 0
      ORDER BY progress ASC
      LIMIT 8
    `, [ids, ids])

    res.json({
      stats: {
        totalStudents: Number(userStats?.total) || 0,
        activeStudents: Number(userStats?.active) || 0,
        averageProgress: Number(averageStats?.averageProgress) || 0,
        completedLessons: Number(completedStats?.completed) || 0,
        totalLessons
      },
      recent: withClassIds(recent),
      modules,
      attention: withClassIds(attention)
    })
  } catch (error) {
    console.error('Teacher overview error:', error)
    res.status(500).json({ message: 'Unable to load teacher dashboard.' })
  }
}

// ============================================================
// GET STUDENTS (only those who joined this teacher's class/classes)
// ============================================================

exports.students = async (req, res) => {
  try {
    const ids = await resolveClassIds(req.user.id, req.query.class_id)
    if (!ids.length) return res.json([])

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
        COALESCE(SUM(sp.attempts), 0) AS attempts,
        ${CLASS_IDS_COL}
      FROM users u
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE u.role = 'student' AND ${IN_CLASS}
      GROUP BY u.id, u.name, u.email, u.section, u.xp, u.level, u.streak, u.last_login
      ORDER BY u.name
    `, [ids, ids])

    res.json(withClassIds(rows))
  } catch (error) {
    console.error('Teacher students error:', error)
    res.status(500).json({ message: 'Unable to load students.' })
  }
}

// ============================================================
// GET SINGLE STUDENT (must be in one of this teacher's classes)
// ============================================================

exports.student = async (req, res) => {
  try {
    const { id } = req.params
    const ids = await resolveClassIds(req.user.id)

    if (!ids.length) {
      return res.status(404).json({ message: 'Student not found.' })
    }

    const [[student]] = await safeQuery(`
      SELECT u.id, u.name, u.email, u.section, u.xp, u.level, u.streak,
             u.last_login, u.created_at
      FROM users u
      WHERE u.id = ? AND u.role = 'student' AND ${IN_CLASS}
    `, [id, ids])

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' })
    }

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
    const ids = await resolveClassIds(req.user.id, req.query.class_id)
    if (!ids.length) return res.json({ modules: [], scores: [] })

    const moduleStats = await getModuleStats(ids)
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
      JOIN users u ON u.id = r.user_id
      WHERE ${IN_CLASS}
      GROUP BY q.type
    `, [ids])

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
    const ids = await resolveClassIds(req.user.id, req.query.class_id)
    if (!ids.length) return res.json([])

    const [rows] = await safeQuery(`
      SELECT u.id, u.name, u.section, u.xp, u.level, u.streak, ${CLASS_IDS_COL}
      FROM users u
      WHERE u.role = 'student' AND ${IN_CLASS}
      ORDER BY u.xp DESC, u.level DESC, u.name ASC
      LIMIT 50
    `, [ids, ids])

    res.json(withClassIds(rows))
  } catch (error) {
    console.error('Teacher leaderboard error:', error)
    res.status(500).json({ message: 'Unable to load leaderboard.' })
  }
}