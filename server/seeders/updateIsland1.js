const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codequest',
}

const lessons = [
  {
    title: "The Gate Golem's Riddle",
    concept: 'What is a Programming Language',
    briefing: "Every computer — even a thousand-year-old golem — only does exactly what it's told, in the exact order it's told. A programming language is how we write those instructions precisely, so there's no room for guessing. Let's give the Golem its first command.",
    background_image: '/assets/landscapes/terrain1.png',
    initial_tile: 0,
    flag_tile: 5,
    solution_code: 'System.out.println("Hello, Golem!");',
    tile_elevations: {},
    ground_fraction: 0.655,
    guided_prompt: 'Which Java instruction precisely wakes the Gate Golem?',
    options: ['System.out.println("Hello, Golem!");', 'println("Hello, Golem!");', 'System.out.println("Hello, Golem!")', 'System.out.read("Hello, Golem!");'],
  },
  {
    title: 'Two Roads Through the Archive',
    concept: 'High-Level vs. Low-Level Programming Languages',
    briefing: 'Low-level languages talk almost directly to the machine\'s hardware — powerful, but dense and hard for people to read. High-level languages, like Java, read closer to English and let a compiler handle the messy translation underneath. Choose the walkway that matches a high-level instruction.',
    background_image: '/assets/landscapes/terrain1.png',
    initial_tile: 5,
    flag_tile: 9,
    solution_code: 'int doorCode = 42;',
    tile_elevations: {},
    ground_fraction: 0.655,
    guided_prompt: 'Which readable, high-level Java instruction stores the archive door code?',
    options: ['int doorCode = 42;', 'MOV AX, 42', 'int doorCode = 42', 'String doorCode = 42;'],
  },
  {
    title: 'The Fogbound Bridge',
    concept: 'Program Development Life Cycle - Problem Definition',
    briefing: "Before writing any code, a programmer defines the problem clearly: what are the inputs, and what output is needed? Skipping this step is how projects — and bridges — collapse halfway across. Define Pip's problem before advancing.",
    background_image: '/assets/landscapes/terrain2.png',
    initial_tile: 0,
    flag_tile: 6,
    solution_code: 'int litLanterns = 0;',
    tile_elevations: {},
    guided_prompt: "What declaration defines Pip's lantern counter before crossing?",
    options: ['int litLanterns = 0;', 'int litLanterns;', 'int litLanterns = 0', 'boolean litLanterns = 0;'],
  },
  {
    title: 'The Flowchart Chamber',
    concept: 'Algorithm Design & Representation',
    briefing: "An algorithm is a clear, ordered set of steps to solve a problem — you can express it in plain language, a flowchart, or pseudocode before ever writing real code. Put the steps of Pip's crossing in the correct sequential order.",
    background_image: '/assets/landscapes/terrain2.png',
    initial_tile: 6,
    flag_tile: 10,
    solution_code: 'if (litLanterns > 0) { System.out.println("Path is lit!"); }',
    tile_elevations: { 9: -15, 10: -15 },
    guided_prompt: 'Which Java statement correctly represents the chamber\'s decision step?',
    options: ['if (litLanterns > 0) { System.out.println("Path is lit!"); }', 'if (litLanterns > 0) System.out.println("Path is lit!")', 'if litLanterns > 0 { System.out.println("Path is lit!"); }', 'while (litLanterns > 0) { System.out.println("Path is lit!"); }'],
  },
  {
    title: "The Coder's Forge",
    concept: 'Coding - Translating Algorithms to Source Code',
    briefing: "Coding is the step where an algorithm — already planned out — finally becomes real source code in a chosen language. Turn the anvil's pseudocode plan into a working Java statement.",
    background_image: '/assets/landscapes/terrain3.png',
    initial_tile: 0,
    flag_tile: 5,
    solution_code: 'String keyname = "Pip";',
    tile_elevations: {},
    guided_prompt: "Which Java declaration for the key's name is correct?",
    options: ['String keyname = "Pip";', 'string keyname = "Pip";', 'String keyname = Pip;', 'int keyname = "Pip";'],
  },
  {
    title: 'The Bug Chasm',
    concept: 'Debugging (Compile-Time vs. Runtime Errors)',
    briefing: 'A compile-time error stops your program before it can even run — usually a syntax mistake like a missing semicolon. A runtime error lets the program start, but something goes wrong while it\'s running, like an infinite loop. Fix the first bridge-machine\'s compile-time error to power it on.',
    background_image: '/assets/landscapes/terrain3.png',
    initial_tile: 5,
    flag_tile: 10,
    solution_code: 'System.out.println("Bridge online");',
    tile_elevations: { 6: -10, 7: -10 },
    guided_prompt: 'Which corrected Java statement compiles and powers on the bridge-machine?',
    options: ['System.out.println("Bridge online");', 'System.out.println("Bridge online")', 'System.ot.println("Bridge online");', 'System.out.println("Bridge online");;'],
  },
]

async function ensureSolutionColumn(connection) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'solution_code'`
  )
  if (Number(rows[0].count) === 0) {
    await connection.execute('ALTER TABLE lessons ADD COLUMN solution_code VARCHAR(500) NULL')
  }
}

function codePattern(code) {
  return code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    await connection.beginTransaction()
    await ensureSolutionColumn(connection)
    await connection.execute(
      "UPDATE lesson_modules SET title = 'Java Foundations', description = 'Learn core Java concepts through the six challenges of The Whispering Ruins.' WHERE id = 1"
    )
    await connection.execute(
      `DELETE gs FROM guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       WHERE l.module_id = 1`
    )
    await connection.execute('DELETE FROM lessons WHERE module_id = 1')

    const lessonValues = lessons.map((lesson, index) => [
      1, `Level ${index + 1}`, 'JAVA FOUNDATIONS', lesson.title, lesson.briefing,
      `Choose the exact Java solution for ${lesson.title}.`, lesson.solution_code, 50,
      lesson.flag_tile, 0, 0, 0, `Use the exact solution: ${lesson.solution_code}`,
      codePattern(lesson.solution_code), lesson.solution_code, index + 1, 1, new Date(), lesson.background_image,
      lesson.concept, lesson.briefing, 10, 1, 10, lesson.initial_tile, lesson.flag_tile,
      lesson.ground_fraction, JSON.stringify({ tile_elevations: lesson.tile_elevations }),
    ])

    await connection.query(
      `INSERT INTO lessons (
        module_id, level_label, track, title, briefing, hint, goal, xp_reward,
        target_tiles, min_moves, min_says, min_jumps, required_code_label,
        required_code_pattern, solution_code, order_index, is_active, created_at,
        background_image, subtitle, description, grid_cols, grid_rows,
        total_tiles, initial_tile, flag_tile, ground_fraction, mechanics_config
      ) VALUES ?`,
      [lessonValues]
    )

    const [rows] = await connection.query(
      'SELECT id, order_index FROM lessons WHERE module_id = 1 ORDER BY order_index'
    )
    const lessonIds = Object.fromEntries(rows.map(row => [Number(row.order_index), Number(row.id)]))
    const guidedValues = lessons.map((lesson, index) => [
      lessonIds[index + 1], 1, lesson.guided_prompt, lesson.options[0],
      lesson.options[1], lesson.options[2], lesson.options[3],
    ])

    await connection.query(
      `INSERT INTO guided_steps (
        lesson_id, step_order, prompt, correct_snippet,
        distractor_1, distractor_2, distractor_3
      ) VALUES ?`,
      [guidedValues]
    )

    await connection.commit()
    console.log(`Island 1 updated: ${lessons.length} lessons and ${guidedValues.length} guided steps.`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Island 1 update failed:', error.message)
  process.exitCode = 1
})
