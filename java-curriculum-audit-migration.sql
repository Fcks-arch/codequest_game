-- Normalize the complete live curriculum to explicit Java syntax.
-- Safe to re-run: all updates are idempotent replacements.
USE codequest;

UPDATE lesson_modules
SET title = REPLACE(title, 'JavaScript', 'Java'),
    description = REPLACE(description, 'JavaScript', 'Java');

UPDATE lessons
SET track = REPLACE(track, 'JavaScript Foundations', 'JAVA FOUNDATIONS'),
    briefing = REPLACE(REPLACE(briefing, 'JavaScript', 'Java'), 'let ', 'int '),
    hint = REPLACE(REPLACE(REPLACE(hint, 'JavaScript', 'Java'), 'let ', 'int '), 'const ', 'final int '),
    goal = REPLACE(REPLACE(REPLACE(goal, 'JavaScript', 'Java'), 'let ', 'int '), 'const ', 'final int '),
    required_code_pattern = REPLACE(REPLACE(required_code_pattern, 'let', 'int'), 'const', 'final int');

-- Level 5 onward introduces declarations with an explicit Java type.
UPDATE lessons
SET hint = CONCAT(
      COALESCE(hint, ''),
      CASE WHEN COALESCE(hint, '') LIKE '%int steps = 3;%' THEN ''
           ELSE ' Use Java declarations such as int steps = 3;, String direction = "right";, and boolean pathClear = true;.' END
    )
WHERE CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(level_label, ' ', -1), ' ', 1) AS UNSIGNED) >= 5;

UPDATE lesson_concepts
SET code_snippet = CASE
      WHEN RIGHT(TRIM(code_snippet), 1) = ';' THEN code_snippet
      ELSE CONCAT(code_snippet, ';')
    END,
    note = REPLACE(note, 'JavaScript', 'Java');

UPDATE guided_steps
SET prompt = REPLACE(prompt, 'JavaScript', 'Java'),
    correct_snippet = CASE WHEN RIGHT(TRIM(correct_snippet), 1) = ';' THEN correct_snippet ELSE CONCAT(correct_snippet, ';') END,
    distractor_1 = CASE WHEN distractor_1 IS NULL OR RIGHT(TRIM(distractor_1), 1) = ';' THEN distractor_1 ELSE CONCAT(distractor_1, ';') END,
    distractor_2 = CASE WHEN distractor_2 IS NULL OR RIGHT(TRIM(distractor_2), 1) = ';' THEN distractor_2 ELSE CONCAT(distractor_2, ';') END,
    distractor_3 = CASE WHEN distractor_3 IS NULL OR RIGHT(TRIM(distractor_3), 1) = ';' THEN distractor_3 ELSE CONCAT(distractor_3, ';') END;

-- Keep distractors compilable too; every callable shown to students must exist.
UPDATE guided_steps SET distractor_1 = REPLACE(distractor_1, 'turnUp(', 'moveUp('), distractor_2 = REPLACE(distractor_2, 'turnUp(', 'moveUp('), distractor_3 = REPLACE(distractor_3, 'turnUp(', 'moveUp(');
UPDATE guided_steps SET distractor_1 = REPLACE(distractor_1, 'jumpRight(', 'jump('), distractor_2 = REPLACE(distractor_2, 'jumpRight(', 'jump('), distractor_3 = REPLACE(distractor_3, 'jumpRight(', 'jump(');
UPDATE guided_steps SET distractor_1 = REPLACE(distractor_1, 'clearObstacle(', 'jump('), distractor_2 = REPLACE(distractor_2, 'clearObstacle(', 'jump('), distractor_3 = REPLACE(distractor_3, 'clearObstacle(', 'jump(');
UPDATE guided_steps SET distractor_1 = REPLACE(distractor_1, 'collectGem(', 'say('), distractor_2 = REPLACE(distractor_2, 'collectGem(', 'say('), distractor_3 = REPLACE(distractor_3, 'collectGem(', 'say(');
UPDATE guided_steps SET distractor_1 = REPLACE(distractor_1, 'swim(', 'moveRight('), distractor_2 = REPLACE(distractor_2, 'swim(', 'moveRight('), distractor_3 = REPLACE(distractor_3, 'swim(', 'moveRight(');