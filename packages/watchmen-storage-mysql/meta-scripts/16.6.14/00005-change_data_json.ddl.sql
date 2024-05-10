ALTER TABLE change_data_json ADD INDEX idx_json_module_trigger_id(module_trigger_id);
alter TABLE change_data_json ADD INDEX idx_json_status_model_trigger_id(status, model_trigger_id);
ALTER TABLE change_data_json ADD INDEX idx_json_model_name_object_id_model_trigger_id(model_name, object_id, model_trigger_id);