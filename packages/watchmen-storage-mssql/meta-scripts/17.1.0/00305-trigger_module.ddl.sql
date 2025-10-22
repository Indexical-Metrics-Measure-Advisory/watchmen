ALTER TABLE trigger_module DROP CONSTRAINT pk_trigger_module;
ALTER TABLE trigger_module ALTER COLUMN module_trigger_id BIGINT NOT NULL;
ALTER TABLE trigger_module ADD CONSTRAINT pk_trigger_module PRIMARY KEY (module_trigger_id);

DROP INDEX idx_trigger_module_event_trigger_id ON trigger_module;
ALTER TABLE trigger_module ALTER COLUMN event_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_trigger_module_event_trigger_id ON trigger_module (event_trigger_id);

ALTER TABLE trigger_module ALTER COLUMN priority  SMALLINT;