const mysql = require('mysql2/promise')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codequest',
  multipleStatements: true,
}

const lessons = [
  {
    order_index: 1,
    level_label: 'Level 1',
    title: 'The Starting Path',
    briefing: 'Pip wakes at the edge of the ruins and must move across the opening platform. The first job is simple: step right, one tile at a time, until the path opens to the flag.',
    hint: 'Use moveRight(1); three times to cross the platform in sequence.',
    goal: 'Move Pip across the starting platform with three rightward steps.',
    xp_reward: 30,
    target_tiles: 3,
    min_moves: 3,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Use three moveRight calls',
    required_code_pattern: 'moveRight\s*\([^;]*\);\s*moveRight\s*\([^;]*\);\s*moveRight\s*\([^;]*\);',
  },
  {
    order_index: 2,
    level_label: 'Level 2',
    title: 'Gap and Leap',
    briefing: 'A broken tile in the path forces Pip to cross the safe ground, jump over the gap, and continue to the flag. Good platforming is about timing as much as movement.',
    hint: 'Use moveRight(2);, jump(1);, and moveRight(2); in order.',
    goal: 'Cross the platform, jump the gap, and continue to the flag.',
    xp_reward: 35,
    target_tiles: 4,
    min_moves: 4,
    min_says: 0,
    min_jumps: 1,
    required_code_label: 'Use moveRight and jump together',
    required_code_pattern: 'moveRight\s*\([^;]*\);\s*jump\s*\([^;]*\);\s*moveRight\s*\([^;]*\);',
  },
  {
    order_index: 3,
    level_label: 'Level 3',
    title: 'Low Obstacle',
    briefing: 'A low wall blocks the next section, so Pip must take one short move, jump across it, and reach the safe ground again. The route becomes a simple movement pattern.',
    hint: 'Keep the actions spatial: move forward, jump over the wall, then move again.',
    goal: 'Clear the low obstacle and land on the next platform.',
    xp_reward: 40,
    target_tiles: 3,
    min_moves: 3,
    min_says: 0,
    min_jumps: 1,
    required_code_label: 'Use a jump in the route',
    required_code_pattern: 'moveRight\s*\([^;]*\);\s*jump\s*\([^;]*\);\s*moveRight\s*\([^;]*\);',
  },
  {
    order_index: 4,
    level_label: 'Level 4',
    title: 'Raised Ledge',
    briefing: 'The ruins rise into a higher ledge. Pip needs a quick step, a jump, and a second move to reach the top platform without falling back to the ground.',
    hint: 'Use jump(1); in the middle of the route to rise onto the ledge.',
    goal: 'Reach the raised ledge with a ground step, a jump, and a final move.',
    xp_reward: 45,
    target_tiles: 4,
    min_moves: 4,
    min_says: 0,
    min_jumps: 1,
    required_code_label: 'Use one jump during the route',
    required_code_pattern: 'moveRight\s*\([^;]*\);\s*jump\s*\([^;]*\);\s*moveRight\s*\([^;]*\);',
  },
  {
    order_index: 5,
    level_label: 'Level 5',
    title: 'Bridge Span',
    briefing: 'The next crossing is measured in tiles. Pip stores the bridge distance in a Java int value, then moves exactly that many steps to land safely on the far side.',
    hint: 'Declare int distance = 4; before using moveRight(distance);.',
    goal: 'Store the bridge distance in a Java variable and use it to move Pip exactly across the bridge.',
    xp_reward: 45,
    target_tiles: 4,
    min_moves: 4,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Declare an int variable and move with it',
    required_code_pattern: 'int\s+distance\s*=\s*\d+\s*;\s*moveRight\s*\(\s*distance\s*\)\s*;',
  },
  {
    order_index: 6,
    level_label: 'Level 6',
    title: 'Moving Platform',
    briefing: 'A moving platform shifts Pip’s route just as he starts crossing. He updates the step count, adds more tiles, and uses the new value to reach the next safe point.',
    hint: 'Use a variable like int stepCount = 2; followed by stepCount += 2; and then moveRight(stepCount);.',
    goal: 'Update a moving-platform step count and use the new value in the crossing.',
    xp_reward: 50,
    target_tiles: 4,
    min_moves: 4,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Use stepCount and +=',
    required_code_pattern: 'int\s+stepCount\s*=\s*\d+\s*;\s*stepCount\s*\+=\s*\d+\s*;\s*moveRight\s*\(\s*stepCount\s*\)\s*;',
  },
  {
    order_index: 7,
    level_label: 'Level 7',
    title: 'Fixed Route',
    briefing: 'A stone switch locks the route length in place, so Pip must treat the bridge distance as fixed. A final int keeps the value steady throughout the crossing.',
    hint: 'Use final int distance = 3; and then call moveRight(distance);.',
    goal: 'Use a fixed bridge distance so Pip follows a predictable route.',
    xp_reward: 50,
    target_tiles: 3,
    min_moves: 3,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Use final int correctly',
    required_code_pattern: 'final\s+int\s+distance\s*=\s*\d+\s*;\s*moveRight\s*\(\s*distance\s*\)\s*;',
  },
  {
    order_index: 8,
    level_label: 'Level 8',
    title: 'Key and Gate',
    briefing: 'Pip finds a locked gate and a key on the same path. He collects the key, stores the item name, and then uses it to unlock the next passage without wasting time.',
    hint: 'Use collectKey(); and useItem("Iron Key"); before moving on.',
    goal: 'Collect the key and use the correct item to open the gate.',
    xp_reward: 55,
    target_tiles: 2,
    min_moves: 2,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Use a platformer item interaction',
    required_code_pattern: 'collectKey\s*\(\s*\)\s*;\s*useItem\s*\(\s*"[^"]+"\s*\)\s*;',
  },
  {
    order_index: 9,
    level_label: 'Level 9',
    title: 'Calculated Crossing',
    briefing: 'The ruins have two bridge spans. Pip adds the distance of both sections and moves across the total so the route stays accurate from one ledge to the next.',
    hint: 'Declare two int values and use moveRight(firstSpan + secondSpan);.',
    goal: 'Add two platform spans and move across the calculated total distance.',
    xp_reward: 60,
    target_tiles: 5,
    min_moves: 5,
    min_says: 0,
    min_jumps: 0,
    required_code_label: 'Add two distances in Java',
    required_code_pattern: 'int\s+firstSpan\s*=\s*\d+\s*;\s*int\s+secondSpan\s*=\s*\d+\s*;\s*moveRight\s*\(\s*firstSpan\s*\+\s*secondSpan\s*\)\s*;',
  },
  {
    order_index: 10,
    level_label: 'Level 10',
    title: 'Ruins Trial',
    briefing: 'The final route tests everything: a stored distance, a defensive posture, a warning message, a leap over a hazard, and the final move to the flag. Pip must stay calm and organized.',
    hint: 'Use int distance = 3;, say("Gate clear."), defend();, jump(1);, and then moveRight(2);.',
    goal: 'Use a stored value, a status message, a defensive action, a jump, and a final move to finish the ruins route.',
    xp_reward: 70,
    target_tiles: 5,
    min_moves: 5,
    min_says: 1,
    min_jumps: 1,
    required_code_label: 'Mix Java variables, say(), and a jump',
    required_code_pattern: 'int\s+distance\s*=\s*\d+\s*;\s*say\s*\(\s*"[^"]+"\s*\)\s*;\s*defend\s*\(\s*\)\s*;\s*jump\s*\([^;]*\)\s*;\s*moveRight\s*\([^;]*\)\s*;',
  },
]

const guidedSteps = [
  {
    lesson_order: 1,
    step_order: 1,
    prompt: 'The ruins door is open. Which Java sequence moves Pip across the starting platform with three rightward steps?',
    correct_snippet: 'moveRight(1);\nmoveRight(1);\nmoveRight(1);',
    distractor_1: 'moveRight(3);',
    distractor_2: 'jump(1);\nmoveRight(1);',
    distractor_3: 'say("Start");\nmoveRight(1);',
  },
  {
    lesson_order: 2,
    step_order: 1,
    prompt: 'A broken tile blocks the middle of the path. Which choice crosses the safe ground, jumps the gap, and continues to the flag?',
    correct_snippet: 'moveRight(2);\njump(1);\nmoveRight(2);',
    distractor_1: 'moveRight(4);',
    distractor_2: 'jump(1);\nmoveRight(4);',
    distractor_3: 'say("Leap");\nmoveRight(2);',
  },
  {
    lesson_order: 3,
    step_order: 1,
    prompt: 'A low barrier sits in front of Pip. Which sequence is the correct safe route?',
    correct_snippet: 'moveRight(1);\njump(1);\nmoveRight(2);',
    distractor_1: 'moveRight(3);',
    distractor_2: 'defend();\nmoveRight(2);',
    distractor_3: 'jump(1);\nmoveRight(1);',
  },
  {
    lesson_order: 4,
    step_order: 1,
    prompt: 'The ledge rises above Pip. Which move order reaches the upper platform safely?',
    correct_snippet: 'moveRight(2);\njump(1);\nmoveRight(2);',
    distractor_1: 'moveRight(4);',
    distractor_2: 'attack();\nmoveRight(2);',
    distractor_3: 'jump(1);\nmoveRight(4);',
  },
  {
    lesson_order: 5,
    step_order: 1,
    prompt: 'Pip needs to cross a bridge whose length is stored in a Java variable. Which code is correct?',
    correct_snippet: 'int distance = 4;\nmoveRight(distance);',
    distractor_1: 'int distance = "4";\nmoveRight(distance);',
    distractor_2: 'moveRight(distance);',
    distractor_3: 'final distance = 4;\nmoveRight(distance);',
  },
  {
    lesson_order: 6,
    step_order: 1,
    prompt: 'The moving platform changed. Which code updates the route and uses the new value?',
    correct_snippet: 'int stepCount = 2;\nstepCount += 2;\nmoveRight(stepCount);',
    distractor_1: 'int stepCount = 2;\nstepCount =+ 2;\nmoveRight(stepCount);',
    distractor_2: 'moveRight(stepCount);',
    distractor_3: 'int stepCount = "4";\nmoveRight(stepCount);',
  },
  {
    lesson_order: 7,
    step_order: 1,
    prompt: 'The bridge length is fixed by the ruins. Which Java snippet keeps the value constant and uses it?',
    correct_snippet: 'final int distance = 3;\nmoveRight(distance);',
    distractor_1: 'const int distance = 3;\nmoveRight(distance);',
    distractor_2: 'final distance = 3;\nmoveRight(distance);',
    distractor_3: 'moveRight(distance);',
  },
  {
    lesson_order: 8,
    step_order: 1,
    prompt: 'Pip finds the gate key. Which snippet correctly picks it up and uses the item?',
    correct_snippet: 'collectKey();\nuseItem("Iron Key");',
    distractor_1: 'collectKey("Iron Key");',
    distractor_2: 'pullLever();\nuseItem("Iron Key");',
    distractor_3: 'useItem("Iron Key");\nattack();',
  },
  {
    lesson_order: 9,
    step_order: 1,
    prompt: 'The path is split across two bridge spans. Which Java code correctly totals both distances before moving?',
    correct_snippet: 'int firstSpan = 2;\nint secondSpan = 3;\nmoveRight(firstSpan + secondSpan);',
    distractor_1: 'moveRight(firstSpan + secondSpan);',
    distractor_2: 'int firstSpan = "2";\nmoveRight(firstSpan + secondSpan);',
    distractor_3: 'moveRight(firstSpan, secondSpan);',
  },
  {
    lesson_order: 10,
    step_order: 1,
    prompt: 'The last trial combines speed, defense, and a hazard jump. Which sequence is the safest route?',
    correct_snippet: 'int distance = 3;\nsay("Gate clear.");\ndefend();\njump(1);\nmoveRight(2);',
    distractor_1: 'int distance = 3;\nmoveRight(distance);\njump();',
    distractor_2: 'int distance = 3;\nattack();\nmoveRight(2);',
    distractor_3: 'say("Gate clear.");\nmoveRight("3");',
  },
]

async function main() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    await connection.beginTransaction()

    await connection.execute("UPDATE lesson_modules SET title = 'Java Foundations', description = 'Learn Pip''s platformer API, movement rules, and story-driven routes on the first island.' WHERE id = 1")

    await connection.execute(
      `DELETE gs FROM guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       WHERE l.module_id = 1`
    )
    await connection.execute(`DELETE FROM lessons WHERE module_id = 1`)

    const values = lessons.map((lesson) => [
      1,
      lesson.level_label,
      'JAVA FOUNDATIONS',
      lesson.title,
      lesson.briefing,
      lesson.hint,
      lesson.goal,
      lesson.xp_reward,
      lesson.target_tiles,
      lesson.min_moves,
      lesson.min_says,
      lesson.min_jumps,
      lesson.required_code_label,
      lesson.required_code_pattern,
      lesson.order_index,
      1,
      new Date(),
    ])

    await connection.query(
      `INSERT INTO lessons (
        module_id,
        level_label,
        track,
        title,
        briefing,
        hint,
        goal,
        xp_reward,
        target_tiles,
        min_moves,
        min_says,
        min_jumps,
        required_code_label,
        required_code_pattern,
        order_index,
        is_active,
        created_at
      ) VALUES ?`,
      [values]
    )

    const [rows] = await connection.query(
      'SELECT id, order_index FROM lessons WHERE module_id = 1 ORDER BY order_index'
    )
    const lessonIds = Object.fromEntries(rows.map((row) => [Number(row.order_index), Number(row.id)]))

    const guidedValues = guidedSteps.map((step) => [
      lessonIds[step.lesson_order],
      step.step_order,
      step.prompt,
      step.correct_snippet,
      step.distractor_1,
      step.distractor_2,
      step.distractor_3,
    ])

    await connection.query(
      `INSERT INTO guided_steps (
        lesson_id,
        step_order,
        prompt,
        correct_snippet,
        distractor_1,
        distractor_2,
        distractor_3
      ) VALUES ?`,
      [guidedValues]
    )

    await connection.commit()
    console.log(`Island 1 updated: ${lessons.length} lessons and ${guidedSteps.length} guided steps.`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error('Island 1 update failed:', error.message)
  process.exitCode = 1
})
