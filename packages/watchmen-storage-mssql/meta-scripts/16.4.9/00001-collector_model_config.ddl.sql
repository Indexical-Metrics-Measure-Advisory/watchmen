CREATE TABLE collector_model_config
(
    model_id            NVARCHAR(50)        NOT NULL,
    model_name          NVARCHAR(50)        NOT NULL,
    depend_on           NVARCHAR(MAX),
    raw_topic_code      NVARCHAR(50)        NOT NULL,
    is_paralleled       TINYINT,
    version             DECIMAL(20),
    tenant_id           NVARCHAR(50)        NOT NULL,
    created_at          DATETIME            NOT NULL,
    created_by          NVARCHAR(50)        NOT NULL,
    last_modified_at    DATETIME            NOT NULL,
    last_modified_by    NVARCHAR(50)        NOT NULL,
    CONSTRAINT pk_collector_model_config PRIMARY KEY (model_id)
);
CREATE UNIQUE INDEX u_collector_model_config_1 ON collector_model_config (model_name);
CREATE INDEX i_collector_model_config_1 ON collector_model_config (tenant_id);
CREATE INDEX i_collector_model_config_2 ON collector_model_config (created_at);
CREATE INDEX i_collector_model_config_3 ON collector_model_config (created_by);
CREATE INDEX i_collector_model_config_4 ON collector_model_config (last_modified_at);
CREATE INDEX i_collector_model_config_5 ON collector_model_config (last_modified_by);