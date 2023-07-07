ALTER TABLE scheduled_task ADD event_id VARCHAR(200) NOT NULL;
ALTER TABLE scheduled_task ADD INDEX event_id (event_id);