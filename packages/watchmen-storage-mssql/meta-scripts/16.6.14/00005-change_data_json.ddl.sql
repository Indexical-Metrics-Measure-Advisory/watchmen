CREATE INDEX idx_json_module_trigger_id ON change_data_json(module_trigger_id);
CREATE INDEX idx_json_status_model_trigger_id ON change_data_json(status, model_trigger_id);
CREATE INDEX idx_json_model_name_object_id_model_trigger_id ON change_data_json(model_name, object_id, model_trigger_id);