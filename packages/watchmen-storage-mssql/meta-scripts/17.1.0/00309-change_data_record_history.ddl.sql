ALTER TABLE change_data_record_history ALTER COLUMN change_record_id BIGINT;
ALTER TABLE change_data_record_history ALTER COLUMN table_trigger_id BIGINT;
ALTER TABLE change_data_record_history ALTER COLUMN model_trigger_id BIGINT;
ALTER TABLE change_data_record_history ALTER COLUMN event_trigger_id BIGINT;
ALTER TABLE change_data_record_history ALTER COLUMN module_trigger_id BIGINT;