ALTER TABLE scheduled_task_history ALTER COLUMN task_id TYPE BIGINT USING task_id::BIGINT;
ALTER TABLE scheduled_task_history ALTER COLUMN event_trigger_id TYPE BIGINT USING event_trigger_id::BIGINT;