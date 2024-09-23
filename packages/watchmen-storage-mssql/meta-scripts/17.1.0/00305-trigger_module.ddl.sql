ALTER TABLE trigger_module ALTER COLUMN module_trigger_id BIGINT;
ALTER TABLE trigger_module ALTER COLUMN event_trigger_id BIGINT;
ALTER TABLE trigger_module ALTER COLUMN priority TYPE SMALLINT;