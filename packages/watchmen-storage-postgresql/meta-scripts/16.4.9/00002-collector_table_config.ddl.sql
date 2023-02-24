CREATE TABLE collector_table_config
(
    config_id           VARCHAR(50)     NOT NULL,
    name                VARCHAR(50)     NOT NULL,
    table_name          VARCHAR(50)     NOT NULL,
    primary_key         JSON            NOT NULL,
    object_key          VARCHAR(50),
    sequence_key        VARCHAR(50),
    model_name          VARCHAR(50)     NOT NULL,
    parent_name         VARCHAR(50),
    label               VARCHAR(50),
    join_keys           JSON,
	depend_on           JSON,
	audit_column        VARCHAR(50)     NOT NULL,
	conditions          JSON,
    data_source_id      VARCHAR(50)     NOT NULL,
    is_list             SMALLINT        NOT NULL,
    triggered           SMALLINT        NOT NULL,
    version             DECIMAL(20),
    tenant_id           VARCHAR(50)     NOT NULL,
    created_at          TIMESTAMP       NOT NULL,
    created_by          VARCHAR(50)     NOT NULL,
    last_modified_at    TIMESTAMP       NOT NULL,
    last_modified_by    VARCHAR(50)     NOT NULL,
    CONSTRAINT pk_collector_table_config PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_collector_table_config_1 ON collector_table_config (name);
CREATE INDEX i_collector_table_config_1 ON collector_table_config (tenant_id);
CREATE INDEX i_collector_table_config_2 ON collector_table_config (created_at);
CREATE INDEX i_collector_table_config_3 ON collector_table_config (created_by);
CREATE INDEX i_collector_table_config_4 ON collector_table_config (last_modified_at);
CREATE INDEX i_collector_table_config_5 ON collector_table_config (last_modified_by);
