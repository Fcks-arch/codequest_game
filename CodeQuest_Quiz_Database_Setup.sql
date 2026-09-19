-- ============================================================
-- CODEQUEST QUIZ DATABASE SETUP
-- One SQL file for groupmates
-- ============================================================

-- USE codequest;


-- 1. QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'in-course',
    lesson_id INT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    section VARCHAR(100) NOT NULL
);


-- 3. STUDENT ↔ CLASS
CREATE TABLE IF NOT EXISTS class_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    UNIQUE KEY unique_class_student (class_id, student_id)
);


-- 4. QUIZ ↔ CLASS
CREATE TABLE IF NOT EXISTS class_quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    quiz_id INT NOT NULL,
    UNIQUE KEY unique_class_quiz (class_id, quiz_id)
);


-- 5. QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS quiz_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question TEXT NOT NULL,
    question_type ENUM(
        'mcq',
        'true_false',
        'code_output',
        'syntax',
        'complete_code',
        'fix_code'
    ) NOT NULL DEFAULT 'mcq',
    language VARCHAR(30) DEFAULT 'java',
    starter_code TEXT NULL,
    expected_output TEXT NULL,
    expected_code TEXT NULL,
    code_hint TEXT NULL,
    points INT NOT NULL DEFAULT 1,
    option_a VARCHAR(300) NULL,
    option_b VARCHAR(300) NULL,
    option_c VARCHAR(300) NULL,
    option_d VARCHAR(300) NULL,
    correct_answer ENUM('a','b','c','d') NOT NULL,
    order_index INT DEFAULT 0,
    code_blanks JSON NULL
);


-- 6. QUIZ RESULTS
CREATE TABLE IF NOT EXISTS quiz_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 7. QUIZ ATTEMPTS
-- UNIQUE(quiz_id, student_id) enforces one attempt.
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    student_id INT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    total_points INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_quiz (quiz_id, student_id)
);

-- 8. User for forgot_password email
ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL;


-- 8. EXISTING-DATABASE UPDATE: code_blanks
-- Run ONLY if quiz_questions exists but code_blanks is missing.
-- ALTER TABLE quiz_questions
-- ADD COLUMN code_blanks JSON NULL;


-- 9. EXISTING-DATABASE UPDATE: one-attempt key
-- Run ONLY if quiz_attempts exists but unique_student_quiz is missing.
-- ALTER TABLE quiz_attempts
-- ADD UNIQUE KEY unique_student_quiz (quiz_id, student_id);


-- 10. OPTIONAL FOREIGN KEYS
-- These are commented out because existing CodeQuest databases
-- may already have these relationships.

-- ALTER TABLE quiz_questions
-- ADD CONSTRAINT fk_quiz_questions_quiz
-- FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
-- ON DELETE CASCADE;

-- ALTER TABLE class_quizzes
-- ADD CONSTRAINT fk_class_quizzes_class
-- FOREIGN KEY (class_id) REFERENCES classes(id)
-- ON DELETE CASCADE;

-- ALTER TABLE class_quizzes
-- ADD CONSTRAINT fk_class_quizzes_quiz
-- FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
-- ON DELETE CASCADE;

-- ALTER TABLE class_students
-- ADD CONSTRAINT fk_class_students_class
-- FOREIGN KEY (class_id) REFERENCES classes(id)
-- ON DELETE CASCADE;

-- ALTER TABLE class_students
-- ADD CONSTRAINT fk_class_students_student
-- FOREIGN KEY (student_id) REFERENCES users(id)
-- ON DELETE CASCADE;

-- ALTER TABLE quiz_attempts
-- ADD CONSTRAINT fk_quiz_attempts_quiz
-- FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
-- ON DELETE CASCADE;

-- ALTER TABLE quiz_attempts
-- ADD CONSTRAINT fk_quiz_attempts_student
-- FOREIGN KEY (student_id) REFERENCES users(id)
-- ON DELETE CASCADE;


-- 11. VERIFICATION
DESCRIBE quizzes;
DESCRIBE classes;
DESCRIBE class_students;
DESCRIBE class_quizzes;
DESCRIBE quiz_questions;
DESCRIBE quiz_results;
DESCRIBE quiz_attempts;

SHOW INDEX FROM quiz_attempts;


-- 12. CHECK QUIZ QUESTIONS
SELECT
    id,
    quiz_id,
    question,
    question_type,
    starter_code,
    code_blanks,
    points,
    order_index
FROM quiz_questions
ORDER BY quiz_id, order_index, id;


-- 13. CHECK QUIZ ATTEMPTS
SELECT
    id,
    quiz_id,
    student_id,
    score,
    total_points,
    submitted_at
FROM quiz_attempts
ORDER BY submitted_at DESC;


-- 14. CHECK QUIZ RESULTS
SELECT
    id,
    user_id,
    quiz_id,
    score,
    total,
    taken_at
FROM quiz_results
ORDER BY taken_at DESC;


-- 15. CHECK QUIZ / CLASS ASSIGNMENTS
SELECT
    cq.id,
    cq.quiz_id,
    cq.class_id,
    c.class_name,
    c.section
FROM class_quizzes cq
LEFT JOIN classes c
    ON c.id = cq.class_id
ORDER BY cq.quiz_id, cq.class_id;


-- END OF CODEQUEST QUIZ DATABASE SETUP
