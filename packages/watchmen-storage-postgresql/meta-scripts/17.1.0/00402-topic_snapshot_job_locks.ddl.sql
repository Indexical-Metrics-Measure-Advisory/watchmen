ALTER TABLE snapshot_job_locks ALTER COLUMN row_count TYPE BIGINT USING row_count::BIGINT;