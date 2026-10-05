ALTER TABLE student_progress
  ADD COLUMN xp_awarded BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE student_progress
SET xp_awarded = TRUE
WHERE phase = 'completed';