ALTER TABLE scheduled_task_history ADD event_id VARCHAR(200) NOT NULL;
ALTER TABLE scheduled_task_history ADD INDEX event_id (event_id);