ALTER TABLE snowflake_competitive_workers ALTER COLUMN data_center_id TYPE INTEGER USING data_center_id::INTEGER;
ALTER TABLE snowflake_competitive_workers ALTER COLUMN worker_id TYPE INTEGER USING worker_id::INTEGER;
