-- Java variable lesson content for Island 1, Level 5: "Name a Value".
-- Safe to re-run: replaces only this lesson's guided steps.
USE codequest;

SET @lesson5_id = (
  SELECT id FROM lessons
  WHERE module_id = 1 AND level_label = 'Level 5' AND title = 'Name a Value'
  LIMIT 1
);

UPDATE lessons
SET track = 'JAVA FOUNDATIONS',
    briefing = 'In Java, every variable must be declared with a specific data type before it can be used. For whole numbers, use the ''int'' type (e.g., int steps = 3;).',
    hint = 'Declare the movement distance with int, then pass the variable to moveRight().',
    goal = 'Declare an int variable and use it in moveRight.'
WHERE id = @lesson5_id;

DELETE FROM guided_steps WHERE lesson_id = @lesson5_id;

INSERT INTO guided_steps
  (lesson_id, step_order, prompt, correct_snippet, distractor_1, distractor_2, distractor_3)
VALUES
(@lesson5_id, 1,
 'Which Java statement declares an integer variable for Pip''s movement distance?',
 'int distance = 3;', 'distance = 3;', 'var distance = 3;', 'String distance = "3";'),
(@lesson5_id, 2,
 'The distance variable is declared. Which Java method call passes it to Pip?',
 'moveRight(distance);', 'moveRight("distance");', 'moveRight(3);', 'jump(distance);');
