USE codequest;

CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  certificate_code VARCHAR(20) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY certificate_code (certificate_code),
  UNIQUE KEY uniq_user_course (user_id, course_name),
  CONSTRAINT fk_certificates_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
