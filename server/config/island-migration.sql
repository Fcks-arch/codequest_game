-- One-time upgrade for an existing CodeQuest database.
-- Run this in MySQL Workbench or phpMyAdmin before starting the updated app.
USE codequest;

CREATE TABLE lesson_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  color VARCHAR(20) NOT NULL DEFAULT '#4F46E5',
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE lessons ADD COLUMN module_id INT NULL AFTER id;

INSERT INTO lesson_modules (title, description, color, order_index) VALUES
('JavaScript Foundations', 'Start with commands, sequence, and your first JavaScript values.', '#22C55E', 1),
('Algorithms and Program Logic', 'Plan, trace, and turn a solution into working JavaScript.', '#4F46E5', 2),
('Variables, Data Types, and Operators', 'Use values and expressions to solve coding challenges.', '#F59E0B', 3),
('Output and Debugging', 'Communicate clearly and trace JavaScript programs with Pip.', '#22C55E', 4),
('Decisions and Conditions', 'Choose the correct route with comparisons and if statements.', '#4F46E5', 5),
('Loops and Repetition', 'Repeat actions safely with while, do-while, and for loops.', '#F59E0B', 6),
('Branching and Flow Control', 'Control a loop precisely with break and continue.', '#22C55E', 7),
('Strings and Template Literals', 'Create, combine, and format text with modern JavaScript.', '#4F46E5', 8);

-- Place the lessons already in your database on the first island.
UPDATE lessons SET module_id = 1 WHERE module_id IS NULL;
ALTER TABLE lessons MODIFY module_id INT NOT NULL;
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_module
  FOREIGN KEY (module_id) REFERENCES lesson_modules(id) ON DELETE CASCADE;
