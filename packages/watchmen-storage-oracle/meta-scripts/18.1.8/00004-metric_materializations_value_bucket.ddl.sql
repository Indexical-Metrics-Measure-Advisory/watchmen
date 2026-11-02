ALTER TABLE metric_materializations
	ADD value_bucket_id VARCHAR2(50) NULL;
ALTER TABLE metric_materializations
	ADD value_bucket_version NUMBER(10) NULL;
