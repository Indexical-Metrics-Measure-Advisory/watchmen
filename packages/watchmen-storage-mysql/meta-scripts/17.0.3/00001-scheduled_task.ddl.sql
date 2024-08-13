ALTER TABLE scheduled_task ADD event_trigger_id BIGINT NOT NULL;

ALTER TABLE scheduled_task DROP INDEX idx_task_event_id;
ALTER TABLE scheduled_task DROP INDEX idx_task_model_name_event_id;
ALTER TABLE scheduled_task DROP INDEX idx_task_model_name_object_id_event_id_tenant_id;

ALTER TABLE scheduled_task ADD INDEX idx_task_event_trigger_id(event_trigger_id);
ALTER TABLE scheduled_task ADD INDEX idx_task_model_name_event_trigger_id(model_name, event_trigger_id);
ALTER TABLE scheduled_task ADD INDEX idx_task_model_name_object_id_event_trigger_id_tenant_id(model_name, object_id, event_trigger_id, tenant_id);