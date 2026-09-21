-- claim (SKIP LOCKED) composites: change_data_json already has (status, model_trigger_id)
ALTER TABLE change_data_record ADD INDEX idx_change_data_record_status_created_at (status, created_at);
ALTER TABLE scheduled_task ADD INDEX idx_scheduled_task_status_created_at (status, created_at);

-- timeout scan (CleanOfTimeout resets stuck EXECUTING rows)
ALTER TABLE change_data_record ADD INDEX idx_change_data_record_tenant_status_time (tenant_id, status, last_modified_at);
ALTER TABLE change_data_json ADD INDEX idx_change_data_json_tenant_status_time (tenant_id, status, last_modified_at);
ALTER TABLE scheduled_task ADD INDEX idx_scheduled_task_tenant_status_time (tenant_id, status, last_modified_at);
