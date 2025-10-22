ALTER TABLE trigger_event DROP CONSTRAINT pk_trigger_event;
ALTER TABLE trigger_event ALTER COLUMN event_trigger_id BIGINT NOT NULL;
ALTER TABLE trigger_event ADD CONSTRAINT pk_trigger_event PRIMARY KEY (event_trigger_id);