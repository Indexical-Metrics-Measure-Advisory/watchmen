ALTER TABLE change_data_record_history DROP CONSTRAINT pk_change_data_record_history;
ALTER TABLE change_data_record_history ALTER COLUMN change_record_id BIGINT NOT NULL;
ALTER TABLE change_data_record_history ADD CONSTRAINT pk_change_data_record_history PRIMARY KEY (change_record_id);

DROP INDEX i_change_data_record_history_6 ON change_data_record_history;
ALTER TABLE change_data_record_history ALTER COLUMN table_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_history_6 ON change_data_record_history (table_trigger_id);

DROP INDEX i_change_data_record_history_7 ON change_data_record_history;
ALTER TABLE change_data_record_history ALTER COLUMN model_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_history_7 ON change_data_record_history (model_trigger_id);

DROP INDEX i_change_data_record_history_8 ON change_data_record_history;
ALTER TABLE change_data_record_history ALTER COLUMN event_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_record_history_8 ON change_data_record_history (event_trigger_id);

ALTER TABLE change_data_record_history ALTER COLUMN module_trigger_id BIGINT NOT NULL;