ALTER TABLE trigger_event ADD status BIGINT;
ALTER TABLE trigger_event ADD type BIGINT;
ALTER TABLE trigger_event ADD table_name VARCHAR(50);
ALTER TABLE trigger_event ADD records JSON;
ALTER TABLE trigger_event MODIFY start_time DATETIME;
ALTER TABLE trigger_event MODIFY end_time DATETIME;
