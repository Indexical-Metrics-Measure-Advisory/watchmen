ALTER TABLE change_data_record DROP CONSTRAINT pk_change_data_record;
ALTER TABLE change_data_record ALTER COLUMN change_record_id BIGINT NOT NULL;
ALTER TABLE change_data_record ADD CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id);

DROP INDEX i_change_data_record_6 ON change_data_record;
ALTER TABLE change_data_record ALTER COLUMN table_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_6 ON change_data_record (table_trigger_id);

DROP INDEX i_change_data_record_7 ON change_data_record;
DROP INDEX idx_record_model_trigger_id ON change_data_record;
ALTER TABLE change_data_record ALTER COLUMN model_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_7 ON change_data_record (model_trigger_id);
CREATE INDEX idx_record_model_trigger_id ON change_data_record (model_trigger_id);


DROP INDEX i_change_data_record_8 ON change_data_record;
ALTER TABLE change_data_record ALTER COLUMN event_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_8 ON change_data_record (event_trigger_id);


DROP INDEX idx_record_module_trigger_id ON change_data_record;
ALTER TABLE change_data_record ALTER COLUMN module_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_record_module_trigger_id ON change_data_record (module_trigger_id);