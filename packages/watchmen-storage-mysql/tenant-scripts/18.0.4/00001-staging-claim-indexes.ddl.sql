-- claim (SKIP LOCKED) composites
ALTER TABLE change_data_record ADD INDEX idx_change_data_record_status_created_at (status, created_at);
ALTER TABLE scheduled_task ADD INDEX idx_scheduled_task_status_created_at (status, created_at);

-- tenant-scoped Lambda timeout scans
ALTER TABLE change_data_record ADD INDEX idx_change_data_record_tenant_status_time (tenant_id, status, last_modified_at);
ALTER TABLE change_data_json ADD INDEX idx_change_data_json_tenant_status_time (tenant_id, status, last_modified_at);
ALTER TABLE scheduled_task ADD INDEX idx_scheduled_task_tenant_status_time (tenant_id, status, last_modified_at);

-- main-service timeout scan is cross-tenant
ALTER TABLE change_data_record ADD INDEX idx_change_data_record_status_time (status, last_modified_at);
ALTER TABLE change_data_json ADD INDEX idx_change_data_json_status_time (status, last_modified_at);
ALTER TABLE scheduled_task ADD INDEX idx_scheduled_task_status_time (status, last_modified_at);
