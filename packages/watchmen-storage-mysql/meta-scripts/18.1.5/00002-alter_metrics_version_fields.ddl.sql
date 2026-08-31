ALTER TABLE metrics ADD COLUMN published_version_no INT DEFAULT NULL;
ALTER TABLE metrics ADD COLUMN last_published_at DATETIME DEFAULT NULL;
