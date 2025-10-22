ALTER TABLE trigger_event ADD  status smallint;
ALTER TABLE trigger_event ADD  type smallint;
ALTER TABLE trigger_event ADD  table_name NVARCHAR(50);
ALTER TABLE trigger_event ADD  records NVARCHAR(MAX);
ALTER TABLE trigger_event ALTER COLUMN start_time DATETIME NULL;
ALTER TABLE trigger_event ALTER COLUMN end_time DATETIME NULL;
