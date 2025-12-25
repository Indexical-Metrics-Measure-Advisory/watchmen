ALTER TABLE trigger_model ALTER COLUMN model_trigger_id TYPE BIGINT USING model_trigger_id::BIGINT;
ALTER TABLE trigger_model ALTER COLUMN event_trigger_id TYPE BIGINT USING event_trigger_id::BIGINT;
ALTER TABLE trigger_model ALTER COLUMN priority TYPE SMALLINT USING priority::SMALLINT;
ALTER TABLE trigger_model ALTER COLUMN module_trigger_id TYPE BIGINT USING module_trigger_id::BIGINT;