ALTER TABLE metric_materializations ADD COLUMN rebuild_pending TINYINT NOT NULL DEFAULT 0;
