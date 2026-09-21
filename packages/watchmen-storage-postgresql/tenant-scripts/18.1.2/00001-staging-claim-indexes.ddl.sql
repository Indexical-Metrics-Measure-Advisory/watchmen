-- claim (SKIP LOCKED) composites: change_data_json already has (status, model_trigger_id)
CREATE INDEX IF NOT EXISTS i_change_data_record_status_created_at ON change_data_record (status, created_at);
CREATE INDEX IF NOT EXISTS i_scheduled_task_status_created_at ON scheduled_task (status, created_at);

-- timeout scan (CleanOfTimeout resets stuck EXECUTING rows)
CREATE INDEX IF NOT EXISTS i_change_data_record_tenant_status_time ON change_data_record (tenant_id, status, last_modified_at);
CREATE INDEX IF NOT EXISTS i_change_data_json_tenant_status_time ON change_data_json (tenant_id, status, last_modified_at);
CREATE INDEX IF NOT EXISTS i_scheduled_task_tenant_status_time ON scheduled_task (tenant_id, status, last_modified_at);
