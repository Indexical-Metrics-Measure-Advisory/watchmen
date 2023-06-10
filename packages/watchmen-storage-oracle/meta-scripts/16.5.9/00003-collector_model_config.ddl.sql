ALTER TABLE collector_model_config
    ADD module_id VARCHAR2(50) NOT NULL;
ALTER TABLE collector_model_config
    ADD priority NUMBER(20) NOT NULL;
