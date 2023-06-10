ALTER TABLE collector_model_config
    ADD module_id NVARCHAR(50) NOT NULL;
ALTER TABLE collector_model_config
    ADD priority DECIMAL(20) NOT NULL;
