ALTER TABLE scheduled_task ADD  event_trigger_id DECIMAL(20) NOT NULL;

DROP INDEX scheduled_task.idx_task_event_id;
DROP INDEX scheduled_task.idx_task_model_name_event_id;
DROP INDEX scheduled_task.idx_task_model_name_object_id_event_id_tenant_id;

CREATE INDEX idx_task_event_trigger_id ON scheduled_task(event_trigger_id);
CREATE INDEX idx_task_model_name_event_trigger_id ON scheduled_task(model_name, event_trigger_id);
CREATE INDEX idx_task_model_name_object_id_event_trigger_id_tenant_id ON scheduled_task(model_name, object_id, event_trigger_id, tenant_id);