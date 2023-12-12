ALTER TABLE scheduled_task_history ADD COLUMN pipeline_id NVARCHAR(50);
ALTER TABLE scheduled_task_history ADD COLUMN type smallint;