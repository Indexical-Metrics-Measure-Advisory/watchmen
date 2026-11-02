ALTER TABLE metric_materializations
	ADD COLUMN value_bucket_id VARCHAR(50) NULL,
	ADD COLUMN value_bucket_version INT NULL;
