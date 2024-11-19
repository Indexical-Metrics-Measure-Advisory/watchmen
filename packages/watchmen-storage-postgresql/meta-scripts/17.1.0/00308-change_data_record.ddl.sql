ALTER TABLE change_data_record ALTER COLUMN change_record_id TYPE BIGINT USING change_record_id::BIGINT;
ALTER TABLE change_data_record ALTER COLUMN table_trigger_id TYPE BIGINT USING table_trigger_id::BIGINT;
ALTER TABLE change_data_record ALTER COLUMN model_trigger_id TYPE BIGINT USING model_trigger_id::BIGINT;
ALTER TABLE change_data_record ALTER COLUMN event_trigger_id TYPE BIGINT USING event_trigger_id::BIGINT;
ALTER TABLE change_data_record ALTER COLUMN module_trigger_id TYPE BIGINT USING module_trigger_id::BIGINT;