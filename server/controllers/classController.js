const db = require('../config/db');

function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  let code = 'KQ-';

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}


/* =========================================================
   TEACHER - CREATE CLASS
========================================================= */

exports.create = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const {
      class_name,
      section
    } = req.body;

    if (!class_name || !class_name.trim()) {
      return res.status(400).json({
        message: 'Class name is required.'
      });
    }

    let classCode;

    while (true) {
      classCode = generateClassCode();

      const [existing] = await db.query(
        `SELECT id FROM classes WHERE class_code = ?`,
        [classCode]
      );

      if (!existing.length) break;
    }

    const [result] = await db.query(`
      INSERT INTO classes
        (teacher_id, class_name, section, class_code)
      VALUES (?, ?, ?, ?)
    `, [
      teacherId,
      class_name.trim(),
      section || null,
      classCode
    ]);

    res.status(201).json({
      id: result.insertId,
      class_name: class_name.trim(),
      section: section || null,
      class_code: classCode
    });

  } catch (error) {
    console.error('create class:', error);

    res.status(500).json({
      message: 'Could not create class.'
    });
  }
};


/* =========================================================
   TEACHER - MY CLASSES
========================================================= */

exports.teacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [rows] = await db.query(`
      SELECT
        c.id,
        c.class_name,
        c.section,
        c.class_code,
        c.created_at,

        COUNT(cs.id) AS student_count

      FROM classes c

      LEFT JOIN class_students cs
        ON cs.class_id = c.id

      WHERE c.teacher_id = ?

      GROUP BY
        c.id,
        c.class_name,
        c.section,
        c.class_code,
        c.created_at

      ORDER BY c.created_at DESC
    `, [teacherId]);

    res.json(rows);

  } catch (error) {
    console.error('teacherClasses:', error);

    res.status(500).json({
      message: 'Could not load classes.'
    });
  }
};


/* =========================================================
   TEACHER - CLASS STUDENTS
========================================================= */

exports.students = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const classId = req.params.id;

    const [rows] = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.section,
        u.xp,
        u.level,
        cs.joined_at

      FROM class_students cs

      INNER JOIN users u
        ON u.id = cs.student_id

      INNER JOIN classes c
        ON c.id = cs.class_id

      WHERE cs.class_id = ?
        AND c.teacher_id = ?

      ORDER BY u.name
    `, [
      classId,
      teacherId
    ]);

    res.json(rows);

  } catch (error) {
    console.error('class students:', error);

    res.status(500).json({
      message: 'Could not load class students.'
    });
  }
};


/* =========================================================
   STUDENT - JOIN CLASS
========================================================= */

exports.join = async (req, res) => {
  try {
    const studentId = req.user.id;

    const {
      class_code
    } = req.body;

    if (!class_code) {
      return res.status(400).json({
        message: 'Enter a class code.'
      });
    }

    const [classes] = await db.query(`
      SELECT
        c.id,
        c.class_name,
        c.section,
        c.class_code,
        u.name AS teacher_name

      FROM classes c

      INNER JOIN users u
        ON u.id = c.teacher_id

      WHERE c.class_code = ?
    `, [
      class_code.trim().toUpperCase()
    ]);

    if (!classes.length) {
      return res.status(404).json({
        message: 'Class code not found.'
      });
    }

    const classInfo = classes[0];

    await db.query(`
      INSERT INTO class_students
        (class_id, student_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        joined_at = joined_at
    `, [
      classInfo.id,
      studentId
    ]);

    res.json({
      message: 'You joined the class successfully.',
      class: classInfo
    });

  } catch (error) {
    console.error('join class:', error);

    res.status(500).json({
      message: 'Could not join class.'
    });
  }
};


/* =========================================================
   STUDENT - MY CLASSES
========================================================= */

exports.studentClasses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [rows] = await db.query(`
      SELECT
        c.id,
        c.class_name,
        c.section,
        c.class_code,
        u.name AS teacher_name,
        cs.joined_at

      FROM class_students cs

      INNER JOIN classes c
        ON c.id = cs.class_id

      INNER JOIN users u
        ON u.id = c.teacher_id

      WHERE cs.student_id = ?

      ORDER BY cs.joined_at DESC
    `, [studentId]);

    res.json(rows);

  } catch (error) {
    console.error('studentClasses:', error);

    res.status(500).json({
      message: 'Could not load your classes.'
    });
  }
};


/* =========================================================
   STUDENT - LEAVE CLASS
========================================================= */

exports.leave = async (req, res) => {
  try {
    const studentId = req.user.id;
    const classId = req.params.id;

    await db.query(`
      DELETE FROM class_students
      WHERE class_id = ?
        AND student_id = ?
    `, [
      classId,
      studentId
    ]);

    res.json({
      message: 'You left the class.'
    });

  } catch (error) {
    console.error('leave class:', error);

    res.status(500).json({
      message: 'Could not leave class.'
    });
  }
};