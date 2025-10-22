ALTER TABLE change_data_json DROP CONSTRAINT pk_change_data_json;
ALTER TABLE change_data_json ALTER COLUMN change_json_id BIGINT NOT NULL;
ALTER TABLE change_data_json ADD CONSTRAINT pk_change_data_json PRIMARY KEY (change_json_id);

DROP INDEX i_change_data_json_6 ON change_data_json;
ALTER TABLE change_data_json ALTER COLUMN table_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_json_6 ON change_data_json (table_trigger_id);

DROP INDEX i_change_data_json_7 ON change_data_json;
DROP INDEX idx_json_model_name_object_id_model_trigger_id ON change_data_json;
DROP INDEX idx_json_status_model_trigger_id ON change_data_json;
ALTER TABLE change_data_json ALTER COLUMN model_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_json_7 ON change_data_json (model_trigger_id);
CREATE INDEX idx_json_model_name_object_id_model_trigger_id ON change_data_json(model_name, object_id, model_trigger_id);
CREATE INDEX idx_json_status_model_trigger_id ON change_data_json(status, model_trigger_id);

DROP INDEX i_change_data_json_8 ON change_data_json;
ALTER TABLE change_data_json ALTER COLUMN event_trigger_id BIGINT NOT NULL;
CREATE INDEX i_change_data_json_8 ON change_data_json (event_trigger_id);

ALTER TABLE change_data_json ALTER COLUMN task_id BIGINT;
ALTER TABLE change_data_json ALTER COLUMN sequence INTEGER;

DROP INDEX idx_json_module_trigger_id ON change_data_json;
ALTER TABLE change_data_json ALTER COLUMN module_trigger_id BIGINT NOT NULL;
CREATE INDEX idx_json_module_trigger_id ON change_data_json (module_trigger_id);