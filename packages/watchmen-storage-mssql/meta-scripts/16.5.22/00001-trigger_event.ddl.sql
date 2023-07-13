ALTER TABLE trigger_event ADD COLUMN status smallint;
ALTER TABLE trigger_event ADD COLUMN type smallint;
ALTER TABLE trigger_event ADD COLUMN table_name NVARCHAR(50);
ALTER TABLE trigger_event ADD COLUMN records NVARCHAR(MAX);
ALTER TABLE trigger_event ALTER COLUMN start_time DATETIME NULL;
ALTER TABLE trigger_event ALTER COLUMN end_time DATETIME NULL;
