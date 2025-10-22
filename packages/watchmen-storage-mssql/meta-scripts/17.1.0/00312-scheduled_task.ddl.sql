ALTER TABLE scheduled_task DROP CONSTRAINT pk_scheduled_task;
ALTER TABLE scheduled_task ALTER COLUMN task_id BIGINT NOT NULL;
ALTER TABLE scheduled_task ADD CONSTRAINT pk_scheduled_task PRIMARY KEY (task_id);


DROP INDEX  idx_task_event_trigger_id ON scheduled_task;
DROP INDEX idx_task_model_name_event_trigger_id ON scheduled_task;
DROP INDEX idx_task_model_name_object_id_event_trigger_id_tenant_id ON scheduled_task;
ALTER TABLE scheduled_task ALTER COLUMN event_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_task_event_trigger_id ON scheduled_task (event_trigger_id);
CREATE INDEX idx_task_model_name_event_trigger_id ON scheduled_task(model_name, event_trigger_id);
CREATE INDEX idx_task_model_name_object_id_event_trigger_id_tenant_id ON scheduled_task(model_name, object_id ,event_trigger_id,tenant_id);