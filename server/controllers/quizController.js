const db = require('../config/db');

function normalizeQuestion(question) {
  let codeBlanks = question.code_blanks ?? null;

  if (typeof codeBlanks === 'string') {
    try {
      codeBlanks = JSON.parse(codeBlanks);
    } catch {
      codeBlanks = null;
    }
  }

  return {
    question: String(question.question || '').trim(),
    question_type: question.question_type || 'mcq',
    language: question.language || 'java',
    option_a: question.option_a || null,
    option_b: question.option_b || null,
    option_c: question.option_c || null,
    option_d: question.option_d || null,
    correct_answer: question.correct_answer || 'a',
    starter_code: question.starter_code || null,
    code_blanks: Array.isArray(codeBlanks)
      ? JSON.stringify(codeBlanks)
      : null,
    expected_output: question.expected_output || null,
    expected_code: question.expected_code || null,
    code_hint: question.code_hint || null,
    points: Number(question.points) || 1,
    order_index: Number(question.order_index) || 0
  };
}

function normalizeClassIds(classIds) {
  if (!Array.isArray(classIds)) return [];

  return [...new Set(
    classIds
      .map((id) => Number(id))
      .filter(
        (id) => Number.isInteger(id) && id > 0
      )
  )];
}

async function validateTeacherClasses(
  connection,
  teacherId,
  classIds
) {
  const ids = normalizeClassIds(classIds);

  if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(', ');

  const [rows] = await connection.query(
    `
    SELECT id, class_name, section
    FROM classes
    WHERE teacher_id = ?
      AND id IN (${placeholders})
    `,
    [teacherId, ...ids]
  );

  if (rows.length !== ids.length) {
    throw new Error(
      'One or more selected classes do not belong to you.'
    );
  }

  return rows;
}

async function getQuizClasses(
  connection,
  quizId
) {
  const [rows] = await connection.query(
    `
    SELECT
      c.id,
      c.class_name,
      c.section
    FROM class_quizzes cq
    INNER JOIN classes c
      ON c.id = cq.class_id
    WHERE cq.quiz_id = ?
    ORDER BY c.class_name ASC, c.section ASC
    `,
    [quizId]
  );

  return rows;
}

async function insertQuestions(
  connection,
  quizId,
  questions
) {
  for (
    let index = 0;
    index < questions.length;
    index++
  ) {
    const q = normalizeQuestion({
      ...questions[index],
      order_index: index
    });

    if (!q.question) {
      throw new Error(
        `Question ${index + 1} is empty.`
      );
    }

    await connection.query(
      `
      INSERT INTO quiz_questions
      (
        quiz_id,
        question,
        question_type,
        language,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        starter_code,
        code_blanks,
        expected_output,
        expected_code,
        code_hint,
        points,
        order_index
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        quizId,
        q.question,
        q.question_type,
        q.language,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.starter_code,
        q.code_blanks,
        q.expected_output,
        q.expected_code,
        q.code_hint,
        q.points,
        q.order_index
      ]
    );
  }
}

async function replaceQuizClasses(
  connection,
  quizId,
  teacherId,
  classIds
) {
  const ids = normalizeClassIds(classIds);

  if (!ids.length) {
    throw new Error(
      'Select at least one class for this quiz.'
    );
  }

  await validateTeacherClasses(
    connection,
    teacherId,
    ids
  );

  await connection.query(
    `
    DELETE FROM class_quizzes
    WHERE quiz_id = ?
    `,
    [quizId]
  );

  for (const classId of ids) {
    await connection.query(
      `
      INSERT INTO class_quizzes
        (class_id, quiz_id)
      VALUES (?, ?)
      `,
      [classId, quizId]
    );
  }
}

/* =========================================================
   TEACHER - LIST QUIZZES
========================================================= */

exports.listTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT
        q.id,
        q.title,
        q.type,
        q.lesson_id,
        q.is_active,
        q.created_at,
        l.title AS lesson_title,
        COUNT(DISTINCT qq.id) AS question_count,
        COUNT(DISTINCT qr.id) AS attempt_count
      FROM quizzes q
      LEFT JOIN lessons l
        ON l.id = q.lesson_id
      LEFT JOIN quiz_questions qq
        ON qq.quiz_id = q.id
      LEFT JOIN quiz_results qr
        ON qr.quiz_id = q.id
      WHERE q.type = 'in-course'
        AND EXISTS (
          SELECT 1
          FROM class_quizzes cq_owner
          INNER JOIN classes c_owner
            ON c_owner.id = cq_owner.class_id
          WHERE cq_owner.quiz_id = q.id
            AND c_owner.teacher_id = ?
        )
      GROUP BY
        q.id,
        q.title,
        q.type,
        q.lesson_id,
        q.is_active,
        q.created_at,
        l.title
      ORDER BY q.created_at DESC
      `,
      [teacherId]
    );

    if (!rows.length) {
      return res.json([]);
    }

    const quizIds = rows.map(
      (quiz) => quiz.id
    );

    const placeholders = quizIds
      .map(() => '?')
      .join(', ');

    const [classRows] = await db.query(
      `
      SELECT
        cq.quiz_id,
        c.id AS class_id,
        c.class_name,
        c.section
      FROM class_quizzes cq
      INNER JOIN classes c
        ON c.id = cq.class_id
      WHERE cq.quiz_id IN (${placeholders})
        AND c.teacher_id = ?
      ORDER BY c.class_name ASC, c.section ASC
      `,
      [...quizIds, teacherId]
    );

    const classesByQuiz = new Map();

    for (const row of classRows) {
      if (!classesByQuiz.has(row.quiz_id)) {
        classesByQuiz.set(row.quiz_id, []);
      }

      classesByQuiz.get(row.quiz_id).push({
        id: row.class_id,
        class_name: row.class_name,
        section: row.section
      });
    }

    const result = rows.map((quiz) => {
      const quizClasses =
        classesByQuiz.get(quiz.id) || [];

      return {
        ...quiz,
        class_ids: quizClasses.map(
          (item) => item.id
        ),
        class_names: quizClasses.map(
          (item) => item.class_name
        ),
        classes: quizClasses
      };
    });

    res.json(result);
  } catch (error) {
    console.error('listTeacher:', error);

    res.status(500).json({
      message: 'Could not load quizzes.'
    });
  }
};

/* =========================================================
   TEACHER - CREATE QUIZ
========================================================= */

exports.create = async (req, res) => {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    const teacherId = req.user.id;

    const {
      title,
      lesson_id,
      questions = [],
      class_ids = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Quiz title is required.'
      });
    }

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message: 'Add at least one question.'
      });
    }

    const classIds =
      normalizeClassIds(class_ids);

    if (!classIds.length) {
      return res.status(400).json({
        message: 'Select at least one class.'
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    await validateTeacherClasses(
      connection,
      teacherId,
      classIds
    );

    const [quizResult] =
      await connection.query(
        `
        INSERT INTO quizzes
          (title, type, lesson_id, is_active)
        VALUES
          (?, 'in-course', ?, 1)
        `,
        [
          title.trim(),
          lesson_id || null
        ]
      );

    const quizId =
      quizResult.insertId;

    await insertQuestions(
      connection,
      quizId,
      questions
    );

    for (const classId of classIds) {
      await connection.query(
        `
        INSERT INTO class_quizzes
          (class_id, quiz_id)
        VALUES (?, ?)
        `,
        [classId, quizId]
      );
    }

    await connection.commit();
    transactionStarted = false;

    res.status(201).json({
      message:
        'Quiz created successfully.',
      id: quizId,
      quiz_id: quizId,
      class_ids: classIds
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      'create quiz:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Could not create quiz.'
    });
  } finally {
    connection.release();
  }
};

/* =========================================================
   TEACHER - GET QUIZ FOR EDITING
========================================================= */

exports.getTeacher = async (
  req,
  res
) => {
  try {
    const teacherId = req.user.id;
    const quizId =
      Number(req.params.id);

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return res.status(400).json({
        message: 'Invalid quiz ID.'
      });
    }

    const [quizRows] =
      await db.query(
        `
        SELECT
          q.id,
          q.title,
          q.type,
          q.lesson_id,
          q.is_active,
          q.created_at,
          l.title AS lesson_title
        FROM quizzes q
        LEFT JOIN lessons l
          ON l.id = q.lesson_id
        WHERE q.id = ?
          AND q.type = 'in-course'
          AND EXISTS (
            SELECT 1
            FROM class_quizzes cq
            INNER JOIN classes c
              ON c.id = cq.class_id
            WHERE cq.quiz_id = q.id
              AND c.teacher_id = ?
          )
        LIMIT 1
        `,
        [quizId, teacherId]
      );

    if (!quizRows.length) {
      return res.status(404).json({
        message:
          'Quiz not found or it is not assigned to one of your classes.'
      });
    }

    const [questions] =
      await db.query(
        `
        SELECT
          id,
          question,
          question_type,
          language,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          starter_code,
          code_blanks,
          expected_output,
          expected_code,
          code_hint,
          points,
          order_index
        FROM quiz_questions
        WHERE quiz_id = ?
        ORDER BY order_index ASC, id ASC
        `,
        [quizId]
      );

    for (const question of questions) {
      if (
        typeof question.code_blanks ===
        'string'
      ) {
        try {
          question.code_blanks =
            JSON.parse(
              question.code_blanks
            );
        } catch {
          question.code_blanks = [];
        }
      }
    }

    const quizClasses =
      await getQuizClasses(
        db,
        quizId
      );

    res.json({
      quiz: {
        ...quizRows[0],
        class_ids:
          quizClasses.map(
            (item) => item.id
          ),
        class_names:
          quizClasses.map(
            (item) => item.class_name
          ),
        classes: quizClasses
      },
      questions
    });
  } catch (error) {
    console.error(
      'getTeacher quiz:',
      error
    );

    res.status(500).json({
      message:
        'Could not load quiz for editing.'
    });
  }
};

/* =========================================================
   TEACHER - UPDATE QUIZ
========================================================= */

exports.update = async (
  req,
  res
) => {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    const teacherId = req.user.id;
    const quizId =
      Number(req.params.id);

    const {
      title,
      lesson_id,
      questions = [],
      class_ids = []
    } = req.body;

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return res.status(400).json({
        message: 'Invalid quiz ID.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Quiz title is required.'
      });
    }

    if (
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message:
          'Add at least one question.'
      });
    }

    const classIds =
      normalizeClassIds(class_ids);

    if (!classIds.length) {
      return res.status(400).json({
        message:
          'Select at least one class.'
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [ownedQuiz] =
      await connection.query(
        `
        SELECT q.id
        FROM quizzes q
        WHERE q.id = ?
          AND q.type = 'in-course'
          AND EXISTS (
            SELECT 1
            FROM class_quizzes cq
            INNER JOIN classes c
              ON c.id = cq.class_id
            WHERE cq.quiz_id = q.id
              AND c.teacher_id = ?
          )
        LIMIT 1
        `,
        [quizId, teacherId]
      );

    if (!ownedQuiz.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message:
          'Quiz not found or you do not have permission to edit it.'
      });
    }

    await validateTeacherClasses(
      connection,
      teacherId,
      classIds
    );

    await connection.query(
      `
      UPDATE quizzes
      SET title = ?, lesson_id = ?
      WHERE id = ?
      `,
      [
        title.trim(),
        lesson_id || null,
        quizId
      ]
    );

    await connection.query(
      `
      DELETE FROM quiz_questions
      WHERE quiz_id = ?
      `,
      [quizId]
    );

    await insertQuestions(
      connection,
      quizId,
      questions
    );

    await connection.query(
      `
      DELETE FROM class_quizzes
      WHERE quiz_id = ?
      `,
      [quizId]
    );

    for (const classId of classIds) {
      await connection.query(
        `
        INSERT INTO class_quizzes
          (class_id, quiz_id)
        VALUES (?, ?)
        `,
        [classId, quizId]
      );
    }

    await connection.commit();
    transactionStarted = false;

    const [quizRows] =
      await db.query(
        `
        SELECT
          q.id,
          q.title,
          q.type,
          q.lesson_id,
          q.is_active,
          q.created_at,
          l.title AS lesson_title
        FROM quizzes q
        LEFT JOIN lessons l
          ON l.id = q.lesson_id
        WHERE q.id = ?
        LIMIT 1
        `,
        [quizId]
      );

    res.json({
      message:
        'Quiz updated successfully.',
      quiz: {
        ...(quizRows[0] || {}),
        class_ids: classIds
      }
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      'update quiz:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Could not update the quiz.'
    });
  } finally {
    connection.release();
  }
};

/* =========================================================
   TEACHER - TOGGLE QUIZ
========================================================= */

exports.toggle = async (
  req,
  res
) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const [owned] =
      await db.query(
        `
        SELECT q.id
        FROM quizzes q
        WHERE q.id = ?
          AND EXISTS (
            SELECT 1
            FROM class_quizzes cq
            INNER JOIN classes c
              ON c.id = cq.class_id
            WHERE cq.quiz_id = q.id
              AND c.teacher_id = ?
          )
        LIMIT 1
        `,
        [id, teacherId]
      );

    if (!owned.length) {
      return res.status(404).json({
        message: 'Quiz not found.'
      });
    }

    await db.query(
      `
      UPDATE quizzes
      SET is_active =
        IF(is_active = 1, 0, 1)
      WHERE id = ?
      `,
      [id]
    );

    const [rows] =
      await db.query(
        `
        SELECT is_active
        FROM quizzes
        WHERE id = ?
        `,
        [id]
      );

    res.json({
      is_active:
        rows[0].is_active
    });
  } catch (error) {
    console.error(
      'toggle quiz:',
      error
    );

    res.status(500).json({
      message:
        'Could not change quiz access.'
    });
  }
};

/* =========================================================
   TEACHER - DELETE QUIZ
========================================================= */

exports.remove = async (
  req,
  res
) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const [owned] =
      await db.query(
        `
        SELECT q.id
        FROM quizzes q
        WHERE q.id = ?
          AND EXISTS (
            SELECT 1
            FROM class_quizzes cq
            INNER JOIN classes c
              ON c.id = cq.class_id
            WHERE cq.quiz_id = q.id
              AND c.teacher_id = ?
          )
        LIMIT 1
        `,
        [id, teacherId]
      );

    if (!owned.length) {
      return res.status(404).json({
        message: 'Quiz not found.'
      });
    }

    await db.query(
      `
      DELETE FROM quizzes
      WHERE id = ?
      `,
      [id]
    );

    res.json({
      message: 'Quiz deleted.'
    });
  } catch (error) {
    console.error(
      'delete quiz:',
      error
    );

    res.status(500).json({
      message:
        'Could not delete quiz.'
    });
  }
};

/* =========================================================
   STUDENT - LIST QUIZZES
========================================================= */

exports.listStudent = async (
  req,
  res
) => {
  try {
    const studentId =
      req.user.id;

    const [rows] =
      await db.query(
        `
        SELECT DISTINCT
          q.id,
          q.title,
          q.lesson_id,
          q.created_at,
          l.title AS lesson_title,

          (
            SELECT COUNT(*)
            FROM quiz_questions qq
            WHERE qq.quiz_id = q.id
          ) AS question_count,

          (
            SELECT qa.score
            FROM quiz_attempts qa
            WHERE qa.quiz_id = q.id
              AND qa.student_id = ?
            LIMIT 1
          ) AS last_score,

          (
            SELECT qa.total_points
            FROM quiz_attempts qa
            WHERE qa.quiz_id = q.id
              AND qa.student_id = ?
            LIMIT 1
          ) AS attempt_total,

          (
            SELECT qa.submitted_at
            FROM quiz_attempts qa
            WHERE qa.quiz_id = q.id
              AND qa.student_id = ?
            LIMIT 1
          ) AS attempted_at

        FROM quizzes q

        INNER JOIN class_quizzes cq
          ON cq.quiz_id = q.id

        INNER JOIN class_students cs
          ON cs.class_id = cq.class_id
         AND cs.student_id = ?

        LEFT JOIN lessons l
          ON l.id = q.lesson_id

        WHERE q.type = 'in-course'
          AND q.is_active = 1

        ORDER BY q.created_at DESC
        `,
        [
          studentId,
          studentId,
          studentId,
          studentId
        ]
      );

    res.json(rows);
  } catch (error) {
    console.error(
      'listStudent:',
      error
    );

    res.status(500).json({
      message:
        'Could not load quizzes.'
    });
  }
};

/* =========================================================
   STUDENT - GET QUIZ

   ONE ATTEMPT:
   If an attempt exists, don't send the questions.
   Send the saved score instead.
========================================================= */

exports.get = async (
  req,
  res
) => {
  try {
    const studentId =
      req.user.id;

    const quizId =
      Number(req.params.id);

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return res.status(400).json({
        message:
          'Invalid quiz ID.'
      });
    }

    const [quizRows] =
      await db.query(
        `
        SELECT DISTINCT
          q.id,
          q.title,
          q.lesson_id,
          q.is_active,
          l.title AS lesson_title

        FROM quizzes q

        INNER JOIN class_quizzes cq
          ON cq.quiz_id = q.id

        INNER JOIN class_students cs
          ON cs.class_id = cq.class_id
         AND cs.student_id = ?

        LEFT JOIN lessons l
          ON l.id = q.lesson_id

        WHERE q.id = ?
          AND q.is_active = 1

        LIMIT 1
        `,
        [
          studentId,
          quizId
        ]
      );

    if (!quizRows.length) {
      return res.status(404).json({
        message:
          'Quiz not found or you are not enrolled in its class.'
      });
    }

    const quiz =
      quizRows[0];

    /* ================================================
       CHECK EXISTING ATTEMPT
    ================================================= */

    const [attemptRows] =
      await db.query(
        `
        SELECT
          id,
          score,
          total_points,
          submitted_at

        FROM quiz_attempts

        WHERE quiz_id = ?
          AND student_id = ?

        LIMIT 1
        `,
        [
          quizId,
          studentId
        ]
      );

    if (attemptRows.length) {
      const attempt =
        attemptRows[0];

      const score =
        Number(attempt.score) || 0;

      const total =
        Number(attempt.total_points) || 0;

      return res.json({
        quiz,

        attempted: true,

        attempt: {
          id: attempt.id,
          score,
          total,
          percentage:
            total > 0
              ? Math.round(
                  (score / total) * 100
                )
              : 0,
          submitted_at:
            attempt.submitted_at
        },

        questions: []
      });
    }

    /* ================================================
       NO ATTEMPT YET
       Send the questions.
    ================================================= */

    const [questions] =
      await db.query(
        `
        SELECT
          id,
          question,
          question_type,
          language,
          option_a,
          option_b,
          option_c,
          option_d,
          starter_code,
          code_blanks,
          code_hint,
          points,
          order_index

        FROM quiz_questions

        WHERE quiz_id = ?

        ORDER BY
          order_index ASC,
          id ASC
        `,
        [quizId]
      );

    for (const question of questions) {
      if (
        typeof question.code_blanks ===
        'string'
      ) {
        try {
          question.code_blanks =
            JSON.parse(
              question.code_blanks
            );
        } catch {
          question.code_blanks = [];
        }
      }
    }

    res.json({
      quiz,
      attempted: false,
      attempt: null,
      questions
    });
  } catch (error) {
    console.error(
      'get quiz:',
      error
    );

    res.status(500).json({
      message:
        'Could not load quiz.'
    });
  }
};

/* =========================================================
   STUDENT - SUBMIT QUIZ

   ONE ATTEMPT ONLY

   1. Check quiz_attempts.
   2. Calculate score.
   3. Insert quiz_attempts.
   4. Keep quiz_results for existing reporting.
========================================================= */

exports.submit = async (
  req,
  res
) => {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    const studentId =
      req.user.id;

    const quizId =
      Number(req.params.id);

    const answers =
      req.body?.answers || {};

    if (
      !Number.isInteger(quizId) ||
      quizId <= 0
    ) {
      return res.status(400).json({
        message:
          'Invalid quiz ID.'
      });
    }

    /* ================================================
       CHECK CLASS ACCESS
    ================================================= */

    const [accessRows] =
      await connection.query(
        `
        SELECT
          q.id,
          q.title

        FROM quizzes q

        INNER JOIN class_quizzes cq
          ON cq.quiz_id = q.id

        INNER JOIN class_students cs
          ON cs.class_id = cq.class_id
         AND cs.student_id = ?

        WHERE q.id = ?
          AND q.is_active = 1

        LIMIT 1
        `,
        [
          studentId,
          quizId
        ]
      );

    if (!accessRows.length) {
      return res.status(403).json({
        message:
          'You are not allowed to submit this quiz.'
      });
    }

    const quizTitle =
      accessRows[0].title;

    await connection.beginTransaction();
    transactionStarted = true;

    /* ================================================
       ONE ATTEMPT CHECK
    ================================================= */

    const [existingAttempt] =
      await connection.query(
        `
        SELECT
          id,
          score,
          total_points,
          submitted_at

        FROM quiz_attempts

        WHERE quiz_id = ?
          AND student_id = ?

        LIMIT 1
        `,
        [
          quizId,
          studentId
        ]
      );

    if (existingAttempt.length) {
      await connection.rollback();
      transactionStarted = false;

      const attempt =
        existingAttempt[0];

      const score =
        Number(attempt.score) || 0;

      const total =
        Number(attempt.total_points) || 0;

      return res.status(409).json({
        message:
          'You have already attempted this quiz. You cannot attempt it again.',

        attempted: true,

        result: {
          quiz: quizTitle,
          score,
          total,
          percentage:
            total > 0
              ? Math.round(
                  (score / total) * 100
                )
              : 0,
          submitted_at:
            attempt.submitted_at
        }
      });
    }

    /* ================================================
       LOAD QUESTIONS FOR SCORING
    ================================================= */

    const [questions] =
      await connection.query(
        `
        SELECT
          id,
          question_type,
          correct_answer,
          expected_output,
          expected_code,
          code_blanks,
          points

        FROM quiz_questions

        WHERE quiz_id = ?

        ORDER BY
          order_index ASC,
          id ASC
        `,
        [quizId]
      );

    if (!questions.length) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message:
          'This quiz has no questions.'
      });
    }

    let score = 0;
    let total = 0;

    const results = [];

    for (const q of questions) {
      const points =
        Number(q.points) || 1;

      total += points;

      const rawAnswer =
        answers[q.id];

      const submitted =
        Array.isArray(rawAnswer)
          ? rawAnswer.map(
              (token) =>
                String(token || '').trim()
            )
          : String(
              rawAnswer ?? ''
            ).trim();

      let correct = false;

      /* ==============================================
         MCQ / TRUE FALSE
      ============================================== */

      if (
        q.question_type === 'mcq' ||
        q.question_type === 'true_false'
      ) {
        correct =
          String(submitted)
            .toLowerCase() ===
          String(
            q.correct_answer || ''
          ).toLowerCase();
      }

      /* ==============================================
         SYNTAX / COMPLETE CODE / FIX CODE
      ============================================== */

      else if (
        q.question_type === 'syntax' ||
        q.question_type ===
          'complete_code' ||
        q.question_type ===
          'fix_code'
      ) {
        /* Normal expected-code comparison. */

        if (
          !Array.isArray(submitted)
        ) {
          correct =
            normalizeCode(
              submitted
            ) ===
            normalizeCode(
              q.expected_code || ''
            );
        }

        /* Complete the Code uses
           selected tokens. */

        if (
          !correct &&
          q.question_type ===
            'complete_code'
        ) {
          let blanks =
            q.code_blanks;

          if (
            typeof blanks ===
            'string'
          ) {
            try {
              blanks =
                JSON.parse(
                  blanks
                );
            } catch {
              blanks = [];
            }
          }

          if (
            Array.isArray(
              blanks
            ) &&
            blanks.length &&
            Array.isArray(
              submitted
            )
          ) {
            const expectedTokens =
              blanks.map(
                (blank) =>
                  String(
                    blank?.answer ||
                      ''
                  ).trim()
              );

            correct =
              submitted.length ===
                expectedTokens.length &&
              submitted.every(
                (
                  token,
                  index
                ) =>
                  normalizeCode(
                    token
                  ) ===
                  normalizeCode(
                    expectedTokens[
                      index
                    ]
                  )
              );
          }
        }
      }

      /* ==============================================
         CODE OUTPUT
      ============================================== */

      else if (
        q.question_type ===
        'code_output'
      ) {
        correct =
          normalizeOutput(
            submitted
          ) ===
          normalizeOutput(
            q.expected_output ||
              ''
          );
      }

      if (correct) {
        score += points;
      }

      results.push({
        question_id: q.id,
        correct,
        points: correct
          ? points
          : 0
      });
    }

    /* ================================================
       SAVE ONE-TIME ATTEMPT
    ================================================= */

    await connection.query(
      `
      INSERT INTO quiz_attempts
      (
        quiz_id,
        student_id,
        score,
        total_points,
        submitted_at
      )
      VALUES (?, ?, ?, ?, NOW())
      `,
      [
        quizId,
        studentId,
        score,
        total
      ]
    );

    /* ================================================
       KEEP EXISTING QUIZ RESULTS

       Teacher score/reporting can continue using this.
    ================================================= */

    await connection.query(
      `
      INSERT INTO quiz_results
      (
        user_id,
        quiz_id,
        score,
        total
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        studentId,
        quizId,
        score,
        total
      ]
    );

    await connection.commit();
    transactionStarted = false;

    res.json({
      quiz: quizTitle,
      score,
      total,
      percentage:
        total > 0
          ? Math.round(
              (score / total) * 100
            )
          : 0,
      results,
      attempted: true
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'submit quiz rollback:',
          rollbackError
        );
      }
    }

    /* ================================================
       DATABASE UNIQUE KEY PROTECTION

       Handles two submissions arriving at almost
       exactly the same time.
    ================================================= */

    if (
      error.code ===
      'ER_DUP_ENTRY'
    ) {
      try {
        const studentId =
          req.user.id;

        const quizId =
          Number(req.params.id);

        const [rows] =
          await db.query(
            `
            SELECT
              qa.score,
              qa.total_points,
              qa.submitted_at,
              q.title

            FROM quiz_attempts qa

            INNER JOIN quizzes q
              ON q.id = qa.quiz_id

            WHERE qa.quiz_id = ?
              AND qa.student_id = ?

            LIMIT 1
            `,
            [
              quizId,
              studentId
            ]
          );

        if (rows.length) {
          const attempt =
            rows[0];

          const score =
            Number(
              attempt.score
            ) || 0;

          const total =
            Number(
              attempt.total_points
            ) || 0;

          return res.status(409).json({
            message:
              'You have already attempted this quiz. You cannot attempt it again.',

            attempted: true,

            result: {
              quiz:
                attempt.title,

              score,

              total,

              percentage:
                total > 0
                  ? Math.round(
                      (score /
                        total) *
                        100
                    )
                  : 0,

              submitted_at:
                attempt.submitted_at
            }
          });
        }
      } catch (lookupError) {
        console.error(
          'duplicate attempt lookup:',
          lookupError
        );
      }
    }

    console.error(
      'submit quiz:',
      error
    );

    res.status(500).json({
      message:
        'Could not submit quiz.'
    });
  } finally {
    connection.release();
  }
};

/* =========================================================
   TEACHER - QUIZ SCORES
========================================================= */

exports.teacherScores = async (
  req,
  res
) => {
  try {
    const teacherId =
      req.user.id;

    const quizId =
      req.params.id;

    const [quiz] =
      await db.query(
        `
        SELECT
          q.id,
          q.title,
          q.lesson_id,
          l.title AS lesson_title

        FROM quizzes q

        LEFT JOIN lessons l
          ON l.id = q.lesson_id

        WHERE q.id = ?

          AND EXISTS (
            SELECT 1

            FROM class_quizzes cq

            INNER JOIN classes c
              ON c.id =
                cq.class_id

            WHERE cq.quiz_id =
              q.id

              AND c.teacher_id =
                ?
          )
        `,
        [
          quizId,
          teacherId
        ]
      );

    if (!quiz.length) {
      return res.status(404).json({
        message:
          'Quiz not found.'
      });
    }

    const [rows] =
      await db.query(
        `
        SELECT
          u.id AS student_id,
          u.name,
          u.section,
          cs.class_id,
          c.class_name,
          qr.score,
          qr.total,
          qr.taken_at

        FROM quiz_results qr

        INNER JOIN users u
          ON u.id = qr.user_id

        INNER JOIN class_students cs
          ON cs.student_id =
            qr.user_id

        INNER JOIN classes c
          ON c.id =
            cs.class_id

        INNER JOIN class_quizzes cq
          ON cq.class_id =
            c.id

         AND cq.quiz_id =
            qr.quiz_id

        WHERE qr.quiz_id = ?
          AND c.teacher_id = ?

        ORDER BY
          qr.taken_at DESC
        `,
        [
          quizId,
          teacherId
        ]
      );

    res.json({
      quiz: quiz[0],
      results: rows
    });
  } catch (error) {
    console.error(
      'teacherScores:',
      error
    );

    res.status(500).json({
      message:
        'Could not load quiz scores.'
    });
  }
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeCode(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(
      (line) => line.trim()
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

function normalizeOutput(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/\s+/g, ' ');
}