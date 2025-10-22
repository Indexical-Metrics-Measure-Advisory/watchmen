ALTER TABLE trigger_table DROP CONSTRAINT pk_trigger_table;
ALTER TABLE trigger_table ALTER COLUMN table_trigger_id BIGINT NOT NULL;
ALTER TABLE trigger_table ADD CONSTRAINT pk_trigger_table PRIMARY KEY (table_trigger_id);

DROP INDEX idx_trigger_table_model_trigger_id ON trigger_table;
ALTER TABLE trigger_table ALTER COLUMN model_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_trigger_table_model_trigger_id ON trigger_table (model_trigger_id);

ALTER TABLE trigger_table ALTER COLUMN event_trigger_id BIGINT;
ALTER TABLE trigger_table ALTER COLUMN module_trigger_id BIGINT;