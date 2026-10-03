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
    background_image: '/assets/landscapes/cathedral-level3.png',
    ground_fraction: 0.63,
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
  briefing: "The bridge asks Pip one question: is at least one lantern lit? A step that asks a question is a decision, and an algorithm can contain decisions. Pip's plan: 1) Count the lit lanterns (Pip counted 3). 2) If the count is greater than 0, announce \"Path is lit!\" 3) Run across the bridge. Turn step 2 into Java. When it's correct, the console prints: Path is lit!",
  background_image: '/assets/landscapes/cathedral-level3.png',
  ground_fraction: 0.63,
  initial_tile: 0,
  flag_tile: 6,
  solution_code: 'if (litLanterns > 0) { System.out.println("Path is lit!"); }',
  tile_elevations: {},
  guided_prompt: 'Which Java statement prints "Path is lit!" only if litLanterns is greater than 0?',
  options: [
    'if (litLanterns > 0) { System.out.println("Path is lit!"); }',
    'if litLanterns > 0 { System.out.println("Path is lit!"); }',
    'while (litLanterns > 0) { System.out.println("Path is lit!"); }',
    'System.out.println("Path is lit!");'
  ],
},

  {
  title: "The Coder's Forge",
  concept: 'Coding - Translating an Algorithm into Source Code',
  briefing: "The forge is where Instruction-Givers turned plans into working instructions. Its anvil only strikes for a named maker. Pip's plan: 1) Get the keyname. 2) Compare it to each name on the Roll. 3) Count the matches. Programmers code one step at a time. Step 1 is to store the keyname, the text \"Pip\". In Java, text goes in a String, inside double quotes. This line prints nothing. The anvil shows you what it stored.",
  background_image: '/assets/landscapes/forge-level5.png',
  ground_fraction: 0.69,   // keep your current value
  initial_tile: 0,
  flag_tile: 5,
  solution_code: 'String keyname = "Pip";',
  tile_elevations: {},
  guided_prompt: 'Which Java statement stores the keyname Pip as text?',
  options: ['String keyname = "Pip";', 'string keyname = "Pip";', 'String keyname = Pip;', 'int keyname = "Pip";'],
},
{
  title: 'The Bug Chasm',
  concept: 'Compile-Time vs Runtime Errors (Debugging)',
  briefing: "Java can fail in two ways.\n\nCompile-time error: Java checks your code first and refuses to start, like a missing semicolon.\nRuntime error: the code starts, then breaks while running, like a loop that never ends.\n\nThe Wheel Bridge won't start. Its panel shows this line:\n\nSystem.out.println(\"Bridge online\")\n\nWhen it's fixed, the console prints: Bridge online",
  background_image: '/assets/landscapes/forge-level5.png',
  ground_fraction: 0.69,   // same value you use for Level 5
  initial_tile: 5,
  flag_tile: 9,
  solution_code: 'System.out.println("Bridge online");',
  tile_elevations: {},
  guided_prompt: 'Java refuses to compile this line. Which version fixes it?',
  options: ['System.out.println("Bridge online");', 'System.out.println("Bridge online")', 'System.ot.println("Bridge online");', 'system.out.println("Bridge online");'],
},
]

async function ensureSchema(connection) {
  const [cols] = await connection.execute(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = 'solution_code'`
  )
  if (Number(cols[0].count) === 0) {
    await connection.execute('ALTER TABLE lessons ADD COLUMN solution_code VARCHAR(500) NULL')
  }

  await ensureUniqueIndex(connection, 'lessons', 'uq_lessons_module_order', 'module_id, order_index')
  await ensureUniqueIndex(connection, 'guided_steps', 'uq_guided_lesson_step', 'lesson_id, step_order')
}

async function ensureUniqueIndex(connection, table, indexName, columns) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  )
  if (Number(rows[0].count) === 0) {
    await connection.execute(`ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (${columns})`)
  }
}

const LESSON_COLUMNS = [
  'module_id', 'level_label', 'track', 'title', 'briefing', 'hint', 'goal', 'xp_reward',
  'target_tiles', 'min_moves', 'min_says', 'min_jumps', 'required_code_label',
  'required_code_pattern', 'solution_code', 'order_index', 'is_active', 'created_at',
  'background_image', 'subtitle', 'description', 'grid_cols', 'grid_rows',
  'total_tiles', 'initial_tile', 'flag_tile', 'ground_fraction', 'mechanics_config',
]

// Never overwrite the identity/key columns or created_at on update
const NO_UPDATE = new Set(['module_id', 'order_index', 'created_at'])
const LESSON_UPDATE_SQL = LESSON_COLUMNS
  .filter(c => !NO_UPDATE.has(c))
  .map(c => `${c} = VALUES(${c})`)
  .join(', ')
function codePattern(code) {
  return code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function main() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    // DDL auto-commits in MySQL, so do it before the transaction
    await ensureSchema(connection)
    await connection.beginTransaction()

    await connection.execute(
      "UPDATE lesson_modules SET title = 'Java Foundations', description = 'Learn core Java concepts through the six challenges of The Whispering Ruins.' WHERE id = 1"
    )

    const lessonValues = lessons.map((lesson, index) => [
      1, `Level ${index + 1}`, 'JAVA FOUNDATIONS', lesson.title, lesson.briefing,
      `Choose the exact Java solution for ${lesson.title}.`, lesson.solution_code, 50,
      lesson.flag_tile, 0, 0, 0, `Use the exact solution: ${lesson.solution_code}`,
      codePattern(lesson.solution_code), lesson.solution_code, index + 1, 1, new Date(), lesson.background_image,
      lesson.concept, lesson.briefing, 10, 1, 10, lesson.initial_tile, lesson.flag_tile,
      lesson.ground_fraction, JSON.stringify({ tile_elevations: lesson.tile_elevations }),
    ])

    // Upsert: existing rows keep their id, new ones get inserted
    await connection.query(
      `INSERT INTO lessons (${LESSON_COLUMNS.join(', ')}) VALUES ?
       ON DUPLICATE KEY UPDATE ${LESSON_UPDATE_SQL}`,
      [lessonValues]
    )

    // If you ever remove lessons from the array, hide them instead of deleting
    await connection.execute(
      'UPDATE lessons SET is_active = 0 WHERE module_id = 1 AND order_index > ?',
      [lessons.length]
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
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        prompt = VALUES(prompt),
        correct_snippet = VALUES(correct_snippet),
        distractor_1 = VALUES(distractor_1),
        distractor_2 = VALUES(distractor_2),
        distractor_3 = VALUES(distractor_3)`,
      [guidedValues]
    )

    await connection.commit()
    console.log(`Island 1 synced: ${lessons.length} lessons and ${guidedValues.length} guided steps.`)
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
