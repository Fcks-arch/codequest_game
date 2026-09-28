const db = require('../config/db');
const PDFDocument = require('pdfkit');

const ALLOWED_TYPES = [
  'class_overview',
  'student_progress',
  'quiz_performance',
  'attention_list'
];

const ALLOWED_FORMATS = ['pdf', 'csv'];

const REPORT_TITLES = {
  class_overview: 'Class Overview',
  student_progress: 'Student Progress',
  quiz_performance: 'Quiz Performance',
  attention_list: 'Students Needing Attention'
};

/* =========================================================
   OWNERSHIP CHECK
   Same pattern as quizController's assertOwnedQuiz — confirms
   a class_id actually belongs to the requesting teacher before
   any query is scoped to it.
========================================================= */

async function assertClassOwnership(teacherId, classId) {
  const [rows] = await db.query(
    `
    SELECT id, class_name, section
    FROM classes
    WHERE id = ? AND teacher_id = ?
    LIMIT 1
    `,
    [classId, teacherId]
  );

  return rows[0] || null;
}

/* =========================================================
   ROW FETCHERS
   Each returns { headers, rows } where rows are plain objects
   keyed by header, in header order. That single shape feeds
   both the CSV writer and the PDF table renderer below.
========================================================= */

async function fetchClassOverviewRows(teacherId, classId) {
  const params = [teacherId];
  let classFilter = '';

  if (classId) {
    classFilter = 'AND c.id = ?';
    params.push(classId);
  }

  const [rows] = await db.query(
    `
    SELECT
      c.id AS class_id,
      c.class_name,
      c.section,
      COUNT(DISTINCT cs.student_id) AS total_students,
      COALESCE(SUM(u.last_login >= CURDATE() - INTERVAL 7 DAY), 0) AS active_students,
      COALESCE(
        ROUND(
          AVG(
            COALESCE(sc.completed, 0)
            / NULLIF((SELECT COUNT(*) FROM lessons WHERE is_active = 1), 0)
            * 100
          )
        ),
        0
      ) AS average_progress
    FROM classes c
    LEFT JOIN class_students cs ON cs.class_id = c.id
    LEFT JOIN users u ON u.id = cs.student_id
    LEFT JOIN (
      SELECT sp.user_id, COUNT(DISTINCT sp.lesson_id) AS completed
      FROM student_progress sp
      JOIN lessons l ON l.id = sp.lesson_id
      WHERE sp.phase = 'completed' AND l.is_active = 1
      GROUP BY sp.user_id
    ) sc ON sc.user_id = cs.student_id
    WHERE c.teacher_id = ? ${classFilter}
    GROUP BY c.id, c.class_name, c.section
    ORDER BY c.class_name ASC, c.section ASC
    `,
    params
  );

  return {
    headers: [
      'Class',
      'Section',
      'Total Students',
      'Active (7d)',
      'Average Progress %'
    ],
    rows: rows.map((r) => ({
      Class: r.class_name,
      Section: r.section || '—',
      'Total Students': r.total_students,
      'Active (7d)': r.active_students,
      'Average Progress %': r.average_progress
    }))
  };
}

function buildStudentProgressResult(rows) {
  return {
    headers: [
      'Name',
      'Email',
      'Class/Section',
      'XP',
      'Level',
      'Streak',
      'Lessons Completed',
      'Progress %',
      'Last Login'
    ],
    rows: rows.map((r) => {
      const total = Number(r.total_lessons) || 0;
      const completed = Number(r.completed) || 0;
      const progress =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        Name: r.name,
        Email: r.email,
        'Class/Section':
          [r.class_name, r.section].filter(Boolean).join(' — ') || '—',
        XP: r.xp || 0,
        Level: r.level || 1,
        Streak: r.streak || 0,
        'Lessons Completed': `${completed}/${total}`,
        'Progress %': progress,
        'Last Login': r.last_login
          ? new Date(r.last_login).toISOString().slice(0, 10)
          : 'Never'
      };
    })
  };
}

async function fetchStudentProgressRows(teacherId, classId) {
  if (classId) {
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        c.class_name,
        c.section,
        u.xp,
        u.level,
        u.streak,
        u.last_login,
        COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END) AS completed,
        (SELECT COUNT(*) FROM lessons WHERE is_active = 1) AS total_lessons
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      JOIN users u ON u.id = cs.student_id
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE c.teacher_id = ? AND c.id = ?
      GROUP BY
        u.id, u.name, u.email, c.class_name, c.section,
        u.xp, u.level, u.streak, u.last_login
      ORDER BY u.name ASC
      `,
      [teacherId, classId]
    );

    return buildStudentProgressResult(rows);
  }

  // No class filter — same "all students" universe the rest of
  // the teacher dashboard (overview/students pages) already uses.
  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.section AS class_name,
      NULL AS section,
      u.xp,
      u.level,
      u.streak,
      u.last_login,
      COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END) AS completed,
      (SELECT COUNT(*) FROM lessons WHERE is_active = 1) AS total_lessons
    FROM users u
    LEFT JOIN student_progress sp ON sp.user_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id, u.name, u.email, u.section, u.xp, u.level, u.streak, u.last_login
    ORDER BY u.name ASC
    `
  );

  return buildStudentProgressResult(rows);
}

async function fetchQuizPerformanceRows(teacherId, classId) {
  const params = [teacherId];
  let classFilter = '';

  if (classId) {
    classFilter = 'AND c.id = ?';
    params.push(classId);
  }

  const [rows] = await db.query(
    `
    SELECT
      u.name AS student_name,
      u.email AS student_email,
      q.title AS quiz_title,
      qr.score,
      qr.total,
      COALESCE(
        ROUND(100 * qr.score / NULLIF(qr.total, 0)),
        0
      ) AS percentage
    FROM quiz_results qr

    INNER JOIN quizzes q
      ON q.id = qr.quiz_id

    INNER JOIN users u
      ON u.id = qr.user_id

    INNER JOIN class_quizzes cq
      ON cq.quiz_id = q.id

    INNER JOIN classes c
      ON c.id = cq.class_id

    INNER JOIN class_students cs
      ON cs.class_id = c.id
      AND cs.student_id = u.id

    WHERE c.teacher_id = ?
      ${classFilter}
      AND q.type = 'in-course'
      AND COALESCE(q.is_archived, 0) = 0

    ORDER BY
      q.created_at DESC,
      u.name ASC
    `,
    params
  );

  return {
    headers: [
      'Student',
      'Email',
      'Quiz',
      'Score',
      'Total',
      'Percentage'
    ],

    rows: rows.map((r) => ({
      Student: r.student_name,
      Email: r.student_email,
      Quiz: r.quiz_title,
      Score: r.score ?? 0,
      Total: r.total ?? 0,
      Percentage: `${r.percentage ?? 0}%`
    }))
  };
}

async function fetchAttentionRows(teacherId, classId) {
  if (classId) {
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        c.class_name,
        c.section,
        u.last_login,
        COALESCE(
          ROUND(
            COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END)
            / NULLIF((SELECT COUNT(*) FROM lessons WHERE is_active = 1), 0) * 100
          ),
          0
        ) AS progress,
        COUNT(CASE WHEN sp.attempts >= 3 THEN 1 END) AS struggles
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      JOIN users u ON u.id = cs.student_id
      LEFT JOIN student_progress sp ON sp.user_id = u.id
      WHERE c.teacher_id = ? AND c.id = ?
      GROUP BY u.id, u.name, c.class_name, c.section, u.last_login
      HAVING
        progress < 40
        OR u.last_login IS NULL
        OR u.last_login < CURDATE() - INTERVAL 7 DAY
        OR struggles > 0
      ORDER BY progress ASC
      `,
      [teacherId, classId]
    );

    return buildAttentionResult(rows);
  }

  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.name,
      u.section AS class_name,
      NULL AS section,
      u.last_login,
      COALESCE(
        ROUND(
          COUNT(DISTINCT CASE WHEN sp.phase = 'completed' THEN sp.lesson_id END)
          / NULLIF((SELECT COUNT(*) FROM lessons WHERE is_active = 1), 0) * 100
        ),
        0
      ) AS progress,
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
    `
  );

  return buildAttentionResult(rows);
}

const REPORT_FETCHERS = {
  class_overview: fetchClassOverviewRows,
  student_progress: fetchStudentProgressRows,
  quiz_performance: fetchQuizPerformanceRows,
  attention_list: fetchAttentionRows
};

/* =========================================================
   CSV WRITER
========================================================= */

function escapeCsvValue(value) {
  const str = String(value ?? '');

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(','));
  }

  // Leading BOM so Excel opens the UTF-8 file without mangling
  // non-ASCII characters (accented names, etc.)
  return '\uFEFF' + lines.join('\n');
}

/* =========================================================
   PDF TABLE RENDERER
   No external table library — just column math, a header row
   repeated on each new page, and ellipsis-truncated cells.
========================================================= */

function buildPdf(res, title, subtitle, headers, rows) {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    layout: 'landscape'
  });

  doc.pipe(res);

  doc.fontSize(18).fillColor('#111').text(title);
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#555').text(subtitle);
  doc.moveDown(1);
  doc.fillColor('#000');

  const startX = doc.page.margins.left;
  const usableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = usableWidth / headers.length;
  const rowHeight = 20;

  const drawHeaderRow = (y) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111');

    headers.forEach((header, i) => {
      doc.text(String(header), startX + i * colWidth, y, {
        width: colWidth - 6,
        ellipsis: true
      });
    });

    doc.font('Helvetica');
  };

  let y = doc.y;
  drawHeaderRow(y);
  y += rowHeight;

  doc
    .moveTo(startX, y - 4)
    .lineTo(startX + usableWidth, y - 4)
    .strokeColor('#cccccc')
    .stroke();

  doc.fontSize(9);

  if (!rows.length) {
    doc.fillColor('#777').text('No data available for this report.', startX, y);
  }

  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
      y = doc.page.margins.top;
      drawHeaderRow(y);
      y += rowHeight;

      doc
        .moveTo(startX, y - 4)
        .lineTo(startX + usableWidth, y - 4)
        .strokeColor('#cccccc')
        .stroke();

      doc.fontSize(9);
    }

    headers.forEach((header, i) => {
      doc
        .fillColor('#000')
        .text(String(row[header] ?? ''), startX + i * colWidth, y, {
          width: colWidth - 6,
          ellipsis: true
        });
    });

    y += rowHeight;
  }

  doc.end();
}

/* =========================================================
   TEACHER - GENERATE REPORT
   GET /api/teacher/reports/generate?type=&class_id=&format=
========================================================= */

exports.generate = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { type, class_id: classIdRaw, format = 'pdf' } = req.query;

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Unknown report type.' });
    }

    if (!ALLOWED_FORMATS.includes(format)) {
      return res.status(400).json({ message: 'Unknown report format.' });
    }

    let classId = null;
    let classLabel = 'All classes';

    if (classIdRaw) {
      classId = Number(classIdRaw);

      if (!Number.isInteger(classId) || classId <= 0) {
        return res.status(400).json({ message: 'Invalid class ID.' });
      }

      const owned = await assertClassOwnership(teacherId, classId);

      if (!owned) {
        return res.status(404).json({ message: 'Class not found.' });
      }

      classLabel = owned.section
        ? `${owned.class_name} — ${owned.section}`
        : owned.class_name;
    }

    const { headers, rows } = await REPORT_FETCHERS[type](
      teacherId,
      classId
    );

    const title = REPORT_TITLES[type];
    const stamp = new Date().toISOString().slice(0, 10);
    const filenameBase = `${type}-${stamp}`;

    if (format === 'csv') {
      const csv = buildCsv(headers, rows);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filenameBase}.csv"`
      );

      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filenameBase}.pdf"`
    );

    const subtitle = `${classLabel} · Generated ${new Date().toLocaleString()}`;

    buildPdf(res, title, subtitle, headers, rows);
  } catch (error) {
    console.error('generate report:', error);

    if (!res.headersSent) {
      res.status(500).json({ message: 'Could not generate the report.' });
    } else {
      res.end();
    }
  }
};