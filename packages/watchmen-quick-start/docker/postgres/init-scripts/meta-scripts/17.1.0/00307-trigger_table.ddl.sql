ALTER TABLE trigger_table ALTER COLUMN table_trigger_id TYPE BIGINT USING table_trigger_id::BIGINT;
ALTER TABLE trigger_table ALTER COLUMN model_trigger_id TYPE BIGINT USING model_trigger_id::BIGINT;
ALTER TABLE trigger_table ALTER COLUMN event_trigger_id TYPE BIGINT USING event_trigger_id::BIGINT;
ALTER TABLE trigger_table ALTER COLUMN module_trigger_id TYPE BIGINT USING module_trigger_id::BIGINT;