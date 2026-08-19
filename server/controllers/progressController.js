const db = require('../config/db')

// GET /api/progress
async function getProgress(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM student_progress WHERE user_id = ?',
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching progress.' })
  }
}

// POST /api/progress/complete
async function completeLesson(req, res) {
  const { lesson_id } = req.body
  const user_id = req.user.id

  if (!lesson_id) return res.json({ message: 'No lesson_id provided.', alreadyDone: true })

  try {
    const [existing] = await db.query(
      'SELECT * FROM student_progress WHERE user_id = ? AND lesson_id = ?',
      [user_id, lesson_id]
    )

    const [lessonRows] = await db.query(
      `SELECT lessons.xp_reward, lessons.module_id, lesson_modules.title AS module_title,
              lesson_modules.order_index AS module_order
       FROM lessons JOIN lesson_modules ON lesson_modules.id = lessons.module_id
       WHERE lessons.id = ?`,
      [lesson_id]
    )
    if (lessonRows.length === 0)
      return res.status(404).json({ message: 'Lesson not found.' })

    const xpReward = lessonRows[0].xp_reward
    const alreadyDone = existing.length > 0 && existing[0].phase === 'completed'

    if (!alreadyDone) {
      await db.query(
        `INSERT INTO student_progress (user_id, lesson_id, phase, completed_at, attempts)
         VALUES (?, ?, 'completed', NOW(), 1)
         ON DUPLICATE KEY UPDATE
         phase='completed', completed_at=NOW(), attempts=attempts+1`,
        [user_id, lesson_id]
      )
    }

    let newXp
    let newLevel
    if (!alreadyDone) {
      const [userRows] = await db.query(
        'SELECT xp FROM users WHERE id = ?',
        [user_id]
      )
      newXp    = userRows[0].xp + xpReward
      newLevel = Math.floor(newXp / 100) + 1

      await db.query(
        'UPDATE users SET xp = ?, level = ? WHERE id = ?',
        [newXp, newLevel, user_id]
      )
    }

    // first-clear badge
    const [clearBadge] = await db.query(
      `SELECT sb.id FROM student_badges sb
       JOIN badges b ON b.id = sb.badge_id
       WHERE sb.user_id = ? AND b.badge_key = 'first-clear'`,
      [user_id]
    )
    const awardedBadges = []
    if (!alreadyDone && clearBadge.length === 0) {
      const [badge] = await db.query(
        "SELECT id FROM badges WHERE badge_key = 'first-clear'"
      )
      if (badge.length > 0) {
        await db.query(
          'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
          [user_id, badge[0].id]
        )
        awardedBadges.push('first-clear')
      }
    }

    const [moduleTotals] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN sp.phase = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM lessons l
       LEFT JOIN student_progress sp ON sp.lesson_id = l.id AND sp.user_id = ?
       WHERE l.module_id = ? AND l.is_active = TRUE`,
      [user_id, lessonRows[0].module_id]
    )
    const islandComplete = Number(moduleTotals[0].total) > 0 &&
      Number(moduleTotals[0].completed) === Number(moduleTotals[0].total)

    if (islandComplete) {
      const badgeKey = `island-${lessonRows[0].module_order}-complete`
      await db.query(
        `INSERT IGNORE INTO badges (badge_key, label, description, icon)
         VALUES (?, ?, ?, 'medal')`,
        [badgeKey, `${lessonRows[0].module_title} Complete`, `Completed every level on ${lessonRows[0].module_title}.`]
      )
      const [islandBadge] = await db.query('SELECT id FROM badges WHERE badge_key = ?', [badgeKey])
      if (islandBadge.length > 0) {
        const [newBadge] = await db.query(
          'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
          [user_id, islandBadge[0].id]
        )
        if (newBadge.affectedRows > 0) awardedBadges.push(badgeKey)
      }
    }

    res.json({
      message: alreadyDone ? 'Already completed.' : 'Lesson completed!',
      lessonCompleted: true,
      alreadyDone,
      islandComplete,
      moduleTitle: lessonRows[0].module_title,
      xpAwarded: alreadyDone ? 0 : xpReward,
      newXp,
      newLevel,
      awardedBadges
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error completing lesson.' })
  }
}

// GET /api/progress/badges
async function getBadges(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT b.badge_key, b.label, b.description, b.icon, sb.earned_at
       FROM student_badges sb
       JOIN badges b ON b.id = sb.badge_id
       WHERE sb.user_id = ?`,
      [req.user.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching badges.' })
  }
}

// GET /api/progress/leaderboard
async function getLeaderboard(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT id, name, section, xp, level
       FROM users WHERE role = 'student'
       ORDER BY xp DESC LIMIT 20`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboard.' })
  }
}

// POST /api/progress/pretest
// Saves pre-test results and weak topic flags per student
async function savePretest(req, res) {
  const user_id = req.user.id
  const { topicScores, weakTopics, totalScore, totalItems } = req.body

  try {
    // Check if already taken
    const [existing] = await db.query(
      'SELECT id FROM pretest_results WHERE user_id = ?',
      [user_id]
    )
    if (existing.length > 0) {
      return res.json({ message: 'Pre-test already taken.', alreadyTaken: true })
    }

    // Save overall result
    await db.query(
      `INSERT INTO pretest_results
       (user_id, total_score, total_items, topic_scores, weak_topics, taken_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        user_id,
        totalScore,
        totalItems,
        JSON.stringify(topicScores),
        JSON.stringify(weakTopics)
      ]
    )

    // Award first-run badge if not yet earned
    const [badge] = await db.query(
      "SELECT id FROM badges WHERE badge_key = 'first-run'"
    )
    if (badge.length > 0) {
      await db.query(
        'INSERT IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)',
        [user_id, badge[0].id]
      )
    }

    res.json({
      message: 'Pre-test saved successfully.',
      weakTopics,
      totalScore,
      totalItems
    })
  } catch (err) {
    console.error('Pre-test save error:', err)
    res.status(500).json({ message: 'Error saving pre-test results.' })
  }
}

// GET /api/progress/pretest
// Returns the student's pre-test result and weak topics
async function getPretestResult(req, res) {
  const user_id = req.user.id
  try {
    const [rows] = await db.query(
      'SELECT * FROM pretest_results WHERE user_id = ?',
      [user_id]
    )
    if (rows.length === 0) {
      return res.json({ taken: false })
    }

    const result = rows[0]
    res.json({
      taken:       true,
      totalScore:  result.total_score,
      totalItems:  result.total_items,
      topicScores: JSON.parse(result.topic_scores),
      weakTopics:  JSON.parse(result.weak_topics),
      takenAt:     result.taken_at
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error fetching pre-test result.' })
  }
}

module.exports = {
  getProgress,
  completeLesson,
  getBadges,
  getLeaderboard,
  savePretest,
  getPretestResult
}
