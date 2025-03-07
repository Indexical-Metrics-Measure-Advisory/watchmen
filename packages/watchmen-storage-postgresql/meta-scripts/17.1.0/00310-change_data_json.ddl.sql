ALTER TABLE change_data_json ALTER COLUMN change_json_id TYPE BIGINT USING change_json_id::BIGINT;
ALTER TABLE change_data_json ALTER COLUMN table_trigger_id TYPE BIGINT USING table_trigger_id::BIGINT;
ALTER TABLE change_data_json ALTER COLUMN model_trigger_id TYPE BIGINT USING model_trigger_id::BIGINT;
ALTER TABLE change_data_json ALTER COLUMN event_trigger_id TYPE BIGINT USING event_trigger_id::BIGINT;
ALTER TABLE change_data_json ALTER COLUMN task_id TYPE BIGINT USING task_id::BIGINT;
ALTER TABLE change_data_json ALTER COLUMN sequence TYPE BIGINT USING sequence::INTEGER;
ALTER TABLE change_data_json ALTER COLUMN module_trigger_id TYPE BIGINT USING module_trigger_id::BIGINT;