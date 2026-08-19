-- Run this once against your existing `codequest` database to add Google Sign-In support.
-- (mysql -u root -p codequest < server/config/google-auth-migration.sql)

ALTER TABLE users
  MODIFY password VARCHAR(255) NULL,          -- Google-only accounts have no local password
  ADD COLUMN google_id VARCHAR(255) UNIQUE NULL AFTER password;
