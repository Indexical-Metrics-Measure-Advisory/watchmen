ALTER TABLE scheduled_task_history ADD event_trigger_id BIGINT NOT NULL;
ALTER TABLE scheduled_task_history DROP INDEX event_id;
ALTER TABLE scheduled_task_history ADD INDEX event_trigger_id(event_trigger_id);