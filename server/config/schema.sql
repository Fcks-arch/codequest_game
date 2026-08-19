-- CodeQuest Database Schema
-- Run this in MySQL Workbench or phpMyAdmin

CREATE DATABASE IF NOT EXISTS codequest;
USE codequest;

-- Users table (students + instructors)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NULL,
  google_id VARCHAR(255) UNIQUE NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL,
  role ENUM('student', 'instructor') DEFAULT 'student',
  section VARCHAR(50),
  nametag VARCHAR(60),
  bio TEXT,
  avatar_url TEXT,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  last_login DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lesson modules are the islands shown on the quest map. Each lesson inside
-- a module is an individual playable activity.
CREATE TABLE lesson_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  color VARCHAR(20) NOT NULL DEFAULT '#4F46E5',
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  level_label VARCHAR(20) NOT NULL,
  track VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  briefing TEXT,
  hint TEXT,
  goal TEXT,
  xp_reward INT DEFAULT 50,
  target_tiles INT DEFAULT 6,
  min_moves INT DEFAULT 0,
  min_says INT DEFAULT 0,
  min_jumps INT DEFAULT 0,
  required_code_label VARCHAR(150),
  required_code_pattern VARCHAR(500),
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES lesson_modules(id) ON DELETE CASCADE
);

-- Guided steps per lesson
CREATE TABLE guided_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  step_order INT NOT NULL,
  prompt TEXT NOT NULL,
  correct_snippet VARCHAR(500) NOT NULL,
  distractor_1 VARCHAR(500),
  distractor_2 VARCHAR(500),
  distractor_3 VARCHAR(500),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Concept examples per lesson
CREATE TABLE lesson_concepts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  code_snippet VARCHAR(500) NOT NULL,
  note VARCHAR(300),
  order_index INT DEFAULT 0,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Student progress per lesson
CREATE TABLE student_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  phase ENUM('guided', 'free', 'completed') DEFAULT 'guided',
  completed_at TIMESTAMP NULL,
  attempts INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_progress (user_id, lesson_id)
);

-- Badges table
CREATE TABLE badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  badge_key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon VARCHAR(50)
);

-- Student badges (earned)
CREATE TABLE student_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_badge (user_id, badge_id)
);

-- Quizzes (pretest / post-test / in-course)
CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  type ENUM('pretest', 'posttest', 'in-course') NOT NULL,
  lesson_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Quiz questions
CREATE TABLE quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question TEXT NOT NULL,
  option_a VARCHAR(300),
  option_b VARCHAR(300),
  option_c VARCHAR(300),
  option_d VARCHAR(300),
  correct_answer ENUM('a','b','c','d') NOT NULL,
  order_index INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Quiz results
CREATE TABLE quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quiz_id INT NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ── SEED DATA ──

INSERT INTO badges (badge_key, label, description, icon) VALUES
('first-run',   'First Run',     'Ran your first program',          'play'),
('first-clear', 'Quest Cleared', 'Completed your first level',       'check'),
('streak-3',    '3-Day Streak',  'Coded for 3 consecutive days',     'flame'),
('var-master',  'Var Novice',    'Cleared the full Variables track', 'medal');

INSERT INTO lesson_modules (title, description, color, order_index) VALUES
('JavaScript Foundations', 'Start with commands, sequence, and your first JavaScript values.', '#22C55E', 1),
('Algorithms and Program Logic', 'Plan, trace, and turn a solution into working JavaScript.', '#4F46E5', 2),
('Variables, Data Types, and Operators', 'Use values, expressions, and operators to solve coding challenges.', '#F59E0B', 3),
('Output and Debugging', 'Communicate clearly and trace JavaScript programs with Pip.', '#22C55E', 4),
('Decisions and Conditions', 'Choose the correct route with comparisons and if statements.', '#4F46E5', 5),
('Loops and Repetition', 'Repeat actions safely with while, do-while, and for loops.', '#F59E0B', 6),
('Branching and Flow Control', 'Control a loop precisely with break and continue.', '#22C55E', 7),
('Strings and Template Literals', 'Create, combine, and format text with modern JavaScript.', '#4F46E5', 8);

INSERT INTO lessons (module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, order_index) VALUES
(1, 'Activity 1', 'JavaScript Foundations', 'Variables: give Pip a speed',
 'This activity teaches students that JavaScript stores values in variables so a program can reuse them. A number can represent distance, and the code becomes easier to read when the value has a name.',
 'Think about which value should be stored first so Pip can keep moving toward the goal. You are not writing the full solution yet — just choosing the right start to the plan.',
 'Declare a variable called speed, set it to 2, then call moveRight(speed) three times.',
 50, 6, 1),
(1, 'Activity 2', 'JavaScript Foundations', 'Variables: strings and numbers',
 'This lesson introduces two important types in JavaScript: numbers for movement and strings for text. Students begin to see that a program can combine different kinds of data to solve a small task.',
 'Think about how Pip should communicate before moving, and how one value can be stored and then reused in a second instruction.',
 'Use a string variable with say(), a number variable with jump(), then reach the flag.',
 60, 6, 2);
