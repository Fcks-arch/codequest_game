-- Adds the pretest_results and posttest_results tables.
--
-- NOTE: pretest_results is queried by progressController.js
-- (savePretest / getPretestResult) but was missing from every migration
-- file shipped in this project, so /api/progress/pretest would currently
-- crash with "Table 'codequest.pretest_results' doesn't exist". This
-- migration creates it, plus the new posttest_results table used by the
-- Java Code Challenge (PostTestPage.jsx).
--
-- Safe to run on the current CodeQuest database — it only adds tables.
USE codequest;

CREATE TABLE IF NOT EXISTS pretest_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_score INT NOT NULL,
  total_items INT NOT NULL,
  topic_scores JSON NOT NULL,
  weak_topics JSON NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_pretest (user_id)
);

-- posttest_results allows multiple attempts per student (no UNIQUE on
-- user_id) so an instructor can track improvement across retakes of the
-- Java Code Challenge.
CREATE TABLE IF NOT EXISTS posttest_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_score INT NOT NULL,
  total_items INT NOT NULL,
  topic_scores JSON NOT NULL,
  difficulty_scores JSON NOT NULL,
  weak_topics JSON NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posttest_user ON posttest_results(user_id);
