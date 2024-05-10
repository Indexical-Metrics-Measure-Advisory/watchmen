ALTER TABLE scheduled_task ADD INDEX idx_task_event_id(event_id);
ALTER TABLE scheduled_task ADD INDEX idx_task_model_name_event_id(model_name, event_id);
ALTER TABLE scheduled_task ADD INDEX idx_task_model_name_object_id_event_id_tenant_id(model_name, object_id, event_id, tenant_id);