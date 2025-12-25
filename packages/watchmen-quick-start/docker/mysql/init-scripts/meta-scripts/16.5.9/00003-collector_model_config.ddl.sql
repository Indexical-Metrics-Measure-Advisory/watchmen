ALTER TABLE collector_model_config
    ADD module_id VARCHAR(50) NOT NULL;
ALTER TABLE collector_model_config
    ADD priority BIGINT NOT NULL;
