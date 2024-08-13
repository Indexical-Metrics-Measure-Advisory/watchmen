ALTER TABLE scheduled_task_history ADD event_trigger_id BIGINT NOT NULL;
ALTER TABLE scheduled_task_history DROP INDEX idx_task_event_id;
ALTER TABLE scheduled_task_history ADD INDEX idx_task_event_id(event_trigger_id);