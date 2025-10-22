ALTER TABLE trigger_model DROP CONSTRAINT pk_trigger_model;
ALTER TABLE trigger_model ALTER COLUMN model_trigger_id BIGINT NOT NULL;
ALTER TABLE trigger_model ADD CONSTRAINT pk_trigger_model PRIMARY KEY (model_trigger_id);

ALTER TABLE trigger_model ALTER COLUMN event_trigger_id BIGINT;
ALTER TABLE trigger_model ALTER COLUMN priority  SMALLINT NOT NULL;

DROP INDEX idx_trigger_model_module_trigger_id ON trigger_model;
ALTER TABLE trigger_model ALTER COLUMN module_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_trigger_model_module_trigger_id ON trigger_model (module_trigger_id);