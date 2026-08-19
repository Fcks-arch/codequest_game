-- Run this once against your existing `codequest` database to add password-reset support.
-- (mysql -u root -p codequest < server/config/password-reset-migration.sql)

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL;
