ALTER TABLE scheduled_task_history DROP CONSTRAINT pk_scheduled_task_history;
ALTER TABLE scheduled_task_history ALTER COLUMN task_id BIGINT NOT NULL;
ALTER TABLE scheduled_task_history ADD CONSTRAINT pk_scheduled_task_history PRIMARY KEY (task_id);

ALTER TABLE scheduled_task_history ALTER COLUMN event_trigger_id BIGINT;