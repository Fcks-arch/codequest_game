const db = require('../config/db')

// GET /api/lessons — all active lessons with guided steps
async function getLessons(req, res) {
  try {
    const [lessons] = await db.query(
      `SELECT lessons.*, lesson_modules.title AS module_title, lesson_modules.color AS module_color,
              lesson_modules.order_index AS module_order
       FROM lessons
       JOIN lesson_modules ON lesson_modules.id = lessons.module_id
       WHERE lessons.is_active = TRUE AND lesson_modules.is_active = TRUE
       ORDER BY lesson_modules.order_index, lessons.order_index`
    )

    for (const lesson of lessons) {
      const [steps] = await db.query(
        'SELECT * FROM guided_steps WHERE lesson_id = ? ORDER BY step_order',
        [lesson.id]
      )
      const [concepts] = await db.query(
        'SELECT * FROM lesson_concepts WHERE lesson_id = ? ORDER BY order_index',
        [lesson.id]
      )
      lesson.guided = steps
      lesson.concepts = concepts
    }

    res.json(lessons)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error fetching lessons.' })
  }
}

// GET /api/lessons/modules — island data with the activities on each island
async function getModules(req, res) {
  try {
    const [modules] = await db.query(
      `SELECT id, title, description, color, order_index
       FROM lesson_modules WHERE is_active = TRUE ORDER BY order_index`
    )
    const [lessons] = await db.query(
      `SELECT id, module_id, level_label, track, title, briefing, hint, goal,
              xp_reward, target_tiles, order_index
       FROM lessons WHERE is_active = TRUE ORDER BY order_index`
    )

    const activitiesByModule = lessons.reduce((groups, lesson) => {
      ;(groups[lesson.module_id] ||= []).push(lesson)
      return groups
    }, {})

    res.json(modules.map(module => ({
      ...module,
      activities: activitiesByModule[module.id] || []
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error fetching lesson modules.' })
  }
}

// GET /api/lessons/:id/next — the next playable activity in the quest path
async function getNextLesson(req, res) {
  try {
    const [currentRows] = await db.query(
      'SELECT id, module_id, order_index FROM lessons WHERE id = ? AND is_active = TRUE',
      [req.params.id]
    )
    if (currentRows.length === 0) return res.status(404).json({ message: 'Lesson not found.' })

    const current = currentRows[0]
    const [sameModule] = await db.query(
      `SELECT id, title, level_label, module_id FROM lessons
       WHERE module_id = ? AND is_active = TRUE AND order_index > ?
       ORDER BY order_index LIMIT 1`,
      [current.module_id, current.order_index]
    )
    if (sameModule.length > 0) return res.json({ nextLesson: sameModule[0] })

    const [nextModule] = await db.query(
      `SELECT id FROM lesson_modules
       WHERE is_active = TRUE AND order_index >
         (SELECT order_index FROM lesson_modules WHERE id = ?)
       ORDER BY order_index LIMIT 1`,
      [current.module_id]
    )
    if (nextModule.length === 0) return res.json({ nextLesson: null })

    const [firstActivity] = await db.query(
      `SELECT id, title, level_label, module_id FROM lessons
       WHERE module_id = ? AND is_active = TRUE ORDER BY order_index LIMIT 1`,
      [nextModule[0].id]
    )
    res.json({ nextLesson: firstActivity[0] || null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error finding the next lesson.' })
  }
}

// GET /api/lessons/:id
async function getLesson(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT lessons.*, lesson_modules.title AS module_title, lesson_modules.color AS module_color
       FROM lessons JOIN lesson_modules ON lesson_modules.id = lessons.module_id
       WHERE lessons.id = ?`,
      [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Lesson not found.' })

    const lesson = rows[0]
    const [steps] = await db.query(
      'SELECT * FROM guided_steps WHERE lesson_id = ? ORDER BY step_order',
      [lesson.id]
    )
    const [concepts] = await db.query(
      'SELECT * FROM lesson_concepts WHERE lesson_id = ? ORDER BY order_index',
      [lesson.id]
    )
    lesson.guided = steps
    lesson.concepts = concepts

    res.json(lesson)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching lesson.' })
  }
}

// POST /api/lessons — instructor creates lesson
async function createLesson(req, res) {
  const { module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, order_index } = req.body
  try {
    const [result] = await db.query(
      'INSERT INTO lessons (module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, order_index) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [module_id, level_label, track, title, briefing, hint, goal, xp_reward || 50, target_tiles || 6, order_index || 0]
    )
    res.status(201).json({ id: result.insertId, message: 'Lesson created.' })
  } catch (err) {
    res.status(500).json({ message: 'Error creating lesson.' })
  }
}

// PUT /api/lessons/:id — instructor updates lesson
async function updateLesson(req, res) {
  const { module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, is_active } = req.body
  try {
    await db.query(
      'UPDATE lessons SET module_id=?, level_label=?, track=?, title=?, briefing=?, hint=?, goal=?, xp_reward=?, target_tiles=?, is_active=? WHERE id=?',
      [module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, is_active, req.params.id]
    )
    res.json({ message: 'Lesson updated.' })
  } catch (err) {
    res.status(500).json({ message: 'Error updating lesson.' })
  }
}

module.exports = { getLessons, getModules, getNextLesson, getLesson, createLesson, updateLesson }
