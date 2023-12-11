ALTER TABLE scheduled_task ADD COLUMN pipeline_id NVARCHAR(50);
ALTER TABLE scheduled_task ADD COLUMN type smallint;