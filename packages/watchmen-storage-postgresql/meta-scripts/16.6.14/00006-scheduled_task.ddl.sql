CREATE INDEX idx_task_event_id ON scheduled_task(event_id);
CREATE INDEX idx_task_model_name_event_id ON scheduled_task(model_name, event_id);
CREATE INDEX idx_task_model_name_object_id_event_id_tenant_id ON scheduled_task(model_name, object_id, event_id, tenant_id);