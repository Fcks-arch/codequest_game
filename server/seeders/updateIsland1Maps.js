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

const levels = [
  ['First Command', 'The Grassy Ledge', 'Move Pip across a flat, linear path with one command at a time.', 30, 4, 1, { path: 'flat', total_tiles: 10, initial_tile: 0, flag_tile: 3, commands: ['moveRight'] }],
  ['Two-Step Trail', 'The Broken Terrace', 'Cross the middle chasm from the left ledge to the right ledge.', 35, 4, 1, { path: 'stepped', total_tiles: 10, initial_tile: 3, gaps: [2, 3, 4, 5, 6], flag_tile: 7, commands: ['jump'], obstacles: [{ type: 'broken-tile', tile: 4, requiredCommand: 'jump', jumpDistance: 4 }] }],
  ['Pip Speaks', 'Whispering Grove', "Reach the archway entrance and announce Pip's entry before walking through the ruined door.", 40, 4, 1, { path: 'flat', total_tiles: 10, initial_tile: 7, flag_tile: 8, exit_action: 'fade_out', commands: ['say', 'moveRight'], interactables: [{ type: 'archway', tile: 8, requiredCommand: 'say' }] }],
  ['Jump Start', 'Low Cliff Pass', 'Pip enters the castle ruins! Walk up to the crate barricade, jump onto the ledge, and proceed to the ancient rune altar.', 45, 5, 1, { path: 'flat', total_tiles: 10, initial_tile: 0, flag_tile: 7, tile_elevations: { 5: -25, 6: -25, 7: -25, 8: -25 }, commands: ['moveRight', 'jump'], obstacles: [{ type: 'boulder', tile: 3, requiredCommand: 'jump', jumpDistance: 2 }] }],
  ['Name a Variable', 'Ancient Measuring Shrine', 'Store the distance in a variable and use it to cross the six-tile shrine path.', 50, 6, 1, { path: 'flat', initial_tile: 7, flag_tile: 9, exit_action: 'fade_out', tile_elevations: { 5: -25, 6: -25, 7: -25, 8: -25, 9: -25 }, commands: ['speak', 'moveRight'], variableDistance: true }],
  ['Double Step', 'Twin Gap Chasm', 'The secret phrase activated the rune altar, unsealing the archway ahead! Pip sets his initial steps, then adds additional distance to his variable using += to reach the inner passage.', 55, 7, 1, { path: 'flat', initial_tile: 7, flag_tile: 10, exit_action: 'fade_out', tile_elevations: { 7: -25, 8: -25, 9: -25, 10: -25 }, commands: ['moveRight'] }],
  ['Dynamic Distance', 'Escalating Terraces', 'Clear the one-tile gap on Tile 2 and the two-tile gap spanning Tiles 5–6.', 60, 8, 1, { path: 'flat', commands: ['moveRight', 'jump'], gaps: [{ start: 2, length: 1 }, { start: 5, length: 2 }] }],
  ['The Clear Path', 'Forest Ruins Trench', 'Use the 3x3 layout to detour around the blocked tile at (3,1).', 65, 3, 3, { path: 'detour', commands: ['moveRight', 'moveUp', 'moveDown'], blockedTiles: [{ col: 3, row: 1, type: 'mud-trench' }] }],
  ['Energy Counter', 'Crystal Gate Courtyard', 'Collect the red and blue crystals, then pass the barrier on Tile 5.', 70, 6, 1, { path: 'flat', commands: ['moveRight'], interactables: [{ type: 'crystal', color: 'red', tile: 2 }, { type: 'crystal', color: 'blue', tile: 4 }], obstacles: [{ type: 'barrier', tile: 5, requiredItems: ['red-crystal', 'blue-crystal'] }] }],
  ['Island 1 Master Trial', 'The Forest Citadel Bridge', 'Complete the milestone track combining rubble, the guardian statue, and the broken bridge.', 80, 10, 1, { path: 'milestone', commands: ['moveRight', 'jump', 'say'], milestones: [{ type: 'rubble', tile: 3 }, { type: 'guardian-statue', tile: 6, requiredCommand: 'say' }, { type: 'broken-bridge', tile: 8, requiredCommand: 'jump' }] }],
]

async function ensureColumn(connection, column, definition) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons' AND COLUMN_NAME = ?`,
    [column]
  )
  if (Number(rows[0].count) === 0) {
    await connection.query(`ALTER TABLE lessons ADD COLUMN ${column} ${definition}`)
  }
}

async function main() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    await connection.beginTransaction()
    await ensureColumn(connection, 'background_image', "VARCHAR(255) NULL")
    await ensureColumn(connection, 'subtitle', "VARCHAR(255) NULL")
    await ensureColumn(connection, 'description', "TEXT NULL")
    await ensureColumn(connection, 'grid_cols', 'INT NOT NULL DEFAULT 1')
    await ensureColumn(connection, 'grid_rows', 'INT NOT NULL DEFAULT 1')
    await ensureColumn(connection, 'total_tiles', 'INT NOT NULL DEFAULT 10')
    await ensureColumn(connection, 'initial_tile', 'INT NOT NULL DEFAULT 0')
    await ensureColumn(connection, 'flag_tile', 'INT NULL')
    await ensureColumn(connection, 'ground_fraction', 'DECIMAL(10,8) NULL')
    await ensureColumn(connection, 'mechanics_config', 'JSON NULL')

    for (let index = 0; index < levels.length; index += 1) {
      const [title, subtitle, description, xpReward, gridCols, gridRows, mechanics] = levels[index]
      await connection.execute(
        `UPDATE lessons
         SET background_image = ?, title = ?, subtitle = ?, description = ?, xp_reward = ?,
           grid_cols = ?, grid_rows = ?, total_tiles = ?, initial_tile = ?, flag_tile = ?,
           ground_fraction = ?, mechanics_config = ?
         WHERE module_id = 1 AND order_index = ?`,
        [index < 3 ? '/assets/landscapes/terrain1.png' : '/assets/landscapes/terrain2.png', title, subtitle, description, xpReward, gridCols, gridRows, 10, index === 1 ? 3 : index === 2 ? 7 : index === 4 || index === 5 ? 7 : 0, index === 0 ? 3 : index === 1 ? 5 : index === 2 ? 8 : index === 3 ? 7 : index === 4 ? 9 : index === 5 ? 10 : null, 550 / 688, JSON.stringify(mechanics), index + 1]
      )
    }

    await connection.execute(
      'UPDATE lessons SET target_tiles = 3 WHERE module_id = 1 AND order_index = 1'
    )
    await connection.execute(
      'UPDATE lessons SET target_tiles = 1 WHERE module_id = 1 AND order_index = 2'
    )
    await connection.execute(
      'UPDATE lessons SET target_tiles = 1 WHERE module_id = 1 AND order_index = 3'
    )
    await connection.execute(
      'UPDATE lessons SET target_tiles = 7 WHERE module_id = 1 AND order_index = 4'
    )
    await connection.execute(
      'UPDATE lessons SET target_tiles = 3 WHERE module_id = 1 AND order_index = 5'
    )
    await connection.execute(
      'UPDATE lessons SET target_tiles = 3 WHERE module_id = 1 AND order_index = 6'
    )
    await connection.execute(
      `UPDATE lessons
      SET briefing = ?, hint = ?, goal = ?, required_code_label = ?, required_code_pattern = ?, min_moves = 0, min_jumps = 1
       WHERE module_id = 1 AND order_index = 2`,
      [
        'Pip starts at the chasm edge and uses a four-tile jump to cross the multi-tile chasm.',
        'Use jump(4); to clear the chasm and land on the far ledge.',
        'Reach the far ledge with one four-tile jump.',
        'Use a four-tile jump: jump(4)',
        'jump\\s*\\(\\s*4\\s*\\)\\s*;'
      ]
    )
    await connection.execute(
      `UPDATE guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       SET gs.prompt = ?, gs.correct_snippet = ?,
           gs.distractor_1 = ?, gs.distractor_2 = ?, gs.distractor_3 = ?
       WHERE l.module_id = 1 AND l.order_index = 2`,
      [
        'Jump four tiles from the chasm edge to the far ledge.',
        'jump(4);',
        'jump(1);',
        'moveRight(4);',
        'jump(2);'
      ]
    )
    await connection.execute(
      `UPDATE lessons
         SET title = ?, briefing = ?, hint = ?, goal = ?, required_code_label = ?,
           required_code_pattern = ?, min_moves = 1, min_says = 1
       WHERE module_id = 1 AND order_index = 3`,
      [
        'Pip Speaks',
        "Pip reaches the archway entrance. Have Pip announce his entry and walk through the ruined door to complete Island 1's outer trail.",
        'Use say("Into the ruins!");, then moveRight(1); through the archway.',
        "Announce Pip's entry and walk through the ruined door.",
        'Use say() and walk through the archway',
        'say\\s*\\(\\s*"Into the ruins!"\\s*\\)\\s*;[\\s\\S]*moveRight\\s*\\(\\s*1\\s*\\)\\s*;'
      ]
    )
    await connection.execute(
      `UPDATE guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       SET gs.prompt = ?, gs.correct_snippet = ?,
           gs.distractor_1 = ?, gs.distractor_2 = ?, gs.distractor_3 = ?
       WHERE l.module_id = 1 AND l.order_index = 3`,
      [
        "Announce Pip's entry, then walk one tile through the ruined archway.",
        'say("Into the ruins!");\nmoveRight(1);',
        'say("Into the ruins!");',
        'moveRight(2);',
        'say("Out of the ruins!");\nmoveRight(2);'
      ]
    )
    await connection.execute(
      `UPDATE lessons
       SET title = ?, briefing = ?, hint = ?, goal = ?, required_code_label = ?,
           required_code_pattern = ?, min_moves = 2, min_jumps = 1
       WHERE module_id = 1 AND order_index = 4`,
      [
        'Jump Start',
        'Pip enters the castle ruins! Walk up to the crate barricade, jump onto the ledge, and proceed to the ancient rune altar.',
        'Use moveRight(3);, jump(2);, then moveRight(2); to reach the blue rune altar.',
        'Reach the blue rune altar after jumping onto the ledge.',
        'Walk, jump, then continue to the rune altar',
        'moveRight\\s*\\(\\s*3\\s*\\)\\s*;[\\s\\S]*jump\\s*\\(\\s*2\\s*\\)\\s*;[\\s\\S]*moveRight\\s*\\(\\s*2\\s*\\)\\s*;'
      ]
    )
    await connection.execute(
      `UPDATE guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       SET gs.prompt = ?, gs.correct_snippet = ?,
           gs.distractor_1 = ?, gs.distractor_2 = ?, gs.distractor_3 = ?
       WHERE l.module_id = 1 AND l.order_index = 4`,
      [
        'Walk to the crate barricade, jump onto the ledge, then reach the blue rune altar.',
        'moveRight(3);\njump(2);\nmoveRight(2);',
        'moveRight(7);',
        'moveRight(3);\njump(1);\nmoveRight(2);',
        'jump(2);\nmoveRight(5);'
      ]
    )
    await connection.execute(
      `UPDATE lessons
       SET title = ?, briefing = ?, hint = ?, goal = ?, required_code_label = ?,
           required_code_pattern = ?, min_moves = 1, min_says = 1
       WHERE module_id = 1 AND order_index = 5`,
      [
        'Name a Variable',
        'Pip stands at the ancient rune altar. Use a variable to speak the secret passage phrase, then head toward the outer bridge.',
        'Declare String phrase = "Open Sesame";, speak(phrase);, then moveRight(3);.',
        'Speak the secret passage phrase and reach the outer bridge.',
        'Use a String variable, speak(), and moveRight(3)',
        'String\\s+phrase\\s*=\\s*"Open Sesame"\\s*;[\\s\\S]*speak\\s*\\(\\s*phrase\\s*\\)\\s*;[\\s\\S]*moveRight\\s*\\(\\s*3\\s*\\)\\s*;'
      ]
    )
    await connection.execute(
      `UPDATE guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       SET gs.prompt = ?, gs.correct_snippet = ?,
           gs.distractor_1 = ?, gs.distractor_2 = ?, gs.distractor_3 = ?
       WHERE l.module_id = 1 AND l.order_index = 5`,
      [
        'Store the phrase in a String variable, speak it, then move to the outer bridge.',
        'String phrase = "Open Sesame";\nspeak(phrase);\nmoveRight(3);',
        'speak("Open Sesame");\nmoveRight(3);',
        'String phrase = "Open Sesame";\nmoveRight(3);',
        'String message = "Open Sesame";\nspeak(message);\nmoveRight(2);'
      ]
    )
    await connection.execute(
      `UPDATE lessons
       SET title = ?, briefing = ?, hint = ?, goal = ?, required_code_label = ?,
           required_code_pattern = ?, min_moves = 1, min_says = 0
       WHERE module_id = 1 AND order_index = 6`,
      [
        'Double Step',
        'The secret phrase activated the rune altar, unsealing the archway ahead! Pip sets his initial steps, then adds additional distance to his variable using += to reach the inner passage.',
        'Declare int stepCount = 1;, increase it with stepCount += 2;, then moveRight(stepCount);.',
        'Declare stepCount, update it with +=, and reach the exit passage.',
        'Declare stepCount, use +=, and reach the exit passage',
        'int\\s+stepCount\\s*=\\s*1\\s*;[\\s\\S]*stepCount\\s*\\+=\\s*2\\s*;[\\s\\S]*moveRight\\s*\\(\\s*stepCount\\s*\\)\\s*;'
      ]
    )
    await connection.execute(
      `UPDATE guided_steps gs
       JOIN lessons l ON l.id = gs.lesson_id
       SET gs.prompt = ?, gs.correct_snippet = ?,
           gs.distractor_1 = ?, gs.distractor_2 = ?, gs.distractor_3 = ?
       WHERE l.module_id = 1 AND l.order_index = 6`,
      [
        'Declare int stepCount = 1; then increase it with stepCount += 2; to cover the remaining distance to the exit.',
        'int stepCount = 1;\nstepCount += 2;\nmoveRight(stepCount);',
        'int stepCount = 3;\nmoveRight(stepCount);',
        'int stepCount = 1;\nstepCount = 2;\nmoveRight(stepCount);',
        'int distance = 1;\ndistance += 2;\nmoveRight(distance);'
      ]
    )

    const [rows] = await connection.execute(
      `SELECT order_index, background_image, title, subtitle, xp_reward, grid_cols, grid_rows
       FROM lessons WHERE module_id = 1 ORDER BY order_index`
    )
    if (rows.length !== levels.length) {
      throw new Error(`Expected ${levels.length} Island 1 lessons, found ${rows.length}.`)
    }

    await connection.commit()
    console.log(`Island 1 maps updated successfully: ${rows.length} lessons.`)
    console.table(rows)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('Island 1 map update failed:', error.message)
  process.exitCode = 1
})
