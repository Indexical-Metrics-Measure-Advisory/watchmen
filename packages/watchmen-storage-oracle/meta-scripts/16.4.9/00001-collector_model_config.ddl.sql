CREATE TABLE collector_model_config
(
    model_id            VARCHAR2(50)        NOT NULL,
    model_name          VARCHAR2(50)        NOT NULL,
    depend_on           CLOB,
    raw_topic_code      VARCHAR2(50)        NOT NULL,
    is_paralleled       NUMBER(1),
    version             NUMBER(8),
    tenant_id           VARCHAR2(50)        NOT NULL,
    created_at          DATE                NOT NULL,
    created_by          VARCHAR2(50)        NOT NULL,
    last_modified_at    DATE                NOT NULL,
    last_modified_by    VARCHAR2(50)        NOT NULL,
    CONSTRAINT pk_collector_model_config PRIMARY KEY (model_id)
);
CREATE UNIQUE INDEX u_collector_model_config_1 ON collector_model_config (model_name);
CREATE INDEX i_collector_model_config_1 ON collector_model_config (tenant_id);
CREATE INDEX i_collector_model_config_2 ON collector_model_config (created_at);
CREATE INDEX i_collector_model_config_3 ON collector_model_config (created_by);
CREATE INDEX i_collector_model_config_4 ON collector_model_config (last_modified_at);
CREATE INDEX i_collector_model_config_5 ON collector_model_config (last_modified_by);