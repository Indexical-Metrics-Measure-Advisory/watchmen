ALTER TABLE metric_materializations ADD COLUMN rebuild_pending SMALLINT NOT NULL DEFAULT 0;
