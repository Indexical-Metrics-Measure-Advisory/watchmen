ALTER TABLE collector_model_config
    ADD COLUMN module_id VARCHAR(50) NOT NULL;
ALTER TABLE collector_model_config
    ADD COLUMN priority DECIMAL(20) NOT NULL;
