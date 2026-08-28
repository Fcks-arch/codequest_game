-- Guided-mode content for Level 1: "First Command" (JAVA FOUNDATIONS).
-- Adds the step-by-step code puzzle students solve in Guided Mode, plus the
-- "What You Just Did" explanation that appears once they finish the task.
-- Safe to re-run: it clears only this lesson's guided_steps/lesson_concepts
-- rows first, then re-inserts them.
USE codequest;

SET @lesson1_id = (
  SELECT id FROM lessons
  WHERE module_id = 1 AND level_label = 'Level 1' AND title = 'First Command'
  LIMIT 1
);

DELETE FROM guided_steps WHERE lesson_id = @lesson1_id;
DELETE FROM lesson_concepts WHERE lesson_id = @lesson1_id;

UPDATE lessons
SET track = 'JAVA FOUNDATIONS',
    briefing = 'Java runs instructions one after another. Pip does not move until you call a method, so the first step is choosing the action that starts the path toward the flag.',
    hint = 'Use a Java-style method call such as moveRight(1);.',
    goal = 'Move Pip 3 tiles with three Java method calls.'
WHERE id = @lesson1_id;

-- Guided steps: students build a three-command sequence that satisfies the
-- lesson's win condition (min_moves = 3).
INSERT INTO guided_steps (lesson_id, step_order, prompt, correct_snippet, distractor_1, distractor_2, distractor_3) VALUES
(@lesson1_id, 1,
 'Pip is at the start of the path. Which command moves Pip one tile toward the flag?',
 'moveRight(1);', 'jump(1);', 'say("1");', 'moveLeft(1);'),
(@lesson1_id, 2,
 'Pip moved one tile. Choose the command that moves one more tile.',
 'moveRight(1);', 'moveRight(0);', 'moveRight(-1);', 'jump(1);'),
(@lesson1_id, 3,
 'Pip is two tiles from the flag. Choose one final move command to reach it.',
 'moveRight(1);', 'moveRight(0);', 'jump(1);', 'say("finish");');

-- Post-task explanation: shown once all guided steps are complete, breaking
-- down what each piece of the code the student picked actually does.
INSERT INTO lesson_concepts (lesson_id, code_snippet, note, order_index) VALUES
(@lesson1_id, 'moveRight(n);',
 'moveRight() is a command Pip already understands. Writing its name followed by parentheses calls it.', 1),
(@lesson1_id, 'moveRight(1);',
 'The number inside the parentheses is an argument. It tells Pip how many tiles to move in that command.', 2),
(@lesson1_id, 'moveRight(1);\nmoveRight(1);\nmoveRight(1);',
 'Java runs commands from top to bottom. Three one-tile method calls add up to three tiles and carry Pip to the flag.', 3);
