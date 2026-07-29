
CREATE TABLE collector_batch_table_config
(
    config_id            BIGINT       NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    source_table_name    VARCHAR(100) NOT NULL,
    target_table_name    VARCHAR(100) NOT NULL,
    fields_mapping       JSON,
    primary_key          JSON,
    action_type          VARCHAR(50)  NOT NULL,
    pipeline_id          VARCHAR(50)  NOT NULL,
    loop_entity_name     VARCHAR(100),
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    version              INTEGER,
    CONSTRAINT pk_collector_batch_table_config PRIMARY KEY (config_id)
);
CREATE INDEX i_collector_batch_table_config_1 ON collector_batch_table_config (source_table_name);
CREATE INDEX i_collector_batch_table_config_5 ON collector_batch_table_config (tenant_id);
CREATE INDEX i_collector_batch_table_config_6 ON collector_batch_table_config (created_at);
CREATE INDEX i_collector_batch_table_config_7 ON collector_batch_table_config (created_by);
CREATE INDEX i_collector_batch_table_config_8 ON collector_batch_table_config (last_modified_at);
CREATE INDEX i_collector_batch_table_config_9 ON collector_batch_table_config (last_modified_by);
