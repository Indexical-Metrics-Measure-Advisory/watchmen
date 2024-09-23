ALTER TABLE change_data_json_history ALTER COLUMN change_json_id BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN sequence BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN task_id BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN table_trigger_id BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN model_trigger_id BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN event_trigger_id BIGINT;
ALTER TABLE change_data_json_history ALTER COLUMN module_trigger_id BIGINT;