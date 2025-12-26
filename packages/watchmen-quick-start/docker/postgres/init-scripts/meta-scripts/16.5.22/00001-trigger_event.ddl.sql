ALTER TABLE trigger_event ADD status SMALLINT;
ALTER TABLE trigger_event ADD type SMALLINT;
ALTER TABLE trigger_event ADD table_name VARCHAR(50);
ALTER TABLE trigger_event ADD records JSON;
ALTER TABLE trigger_event ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE trigger_event ALTER COLUMN end_time DROP NOT NULL;
