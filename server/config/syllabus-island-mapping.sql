-- Places the 14 existing syllabus activities on their correct lesson islands.
-- Safe to run on the current CodeQuest database: it does not delete lessons,
-- guided steps, quiz data, or student progress.
USE codequest;

UPDATE lessons
SET module_id = CASE track
  WHEN 'Introduction to Programming' THEN 1
  WHEN 'Intro to Programming' THEN 1
  WHEN 'Program Logic Design' THEN 2
  WHEN 'Introduction to Java' THEN 3
  WHEN 'Introduction to Java Programming' THEN 3
  WHEN 'Basic Input/Output' THEN 4
  WHEN 'Input / Output' THEN 4
  WHEN 'Control Structures: Decision' THEN 5
  WHEN 'Decision Structures' THEN 5
  WHEN 'Control Structures: Repetition' THEN 6
  WHEN 'Repetition Structures' THEN 6
  WHEN 'Control Structures: Branching' THEN 7
  WHEN 'Branching' THEN 7
  WHEN 'Java Strings' THEN 8
  ELSE module_id
END;
