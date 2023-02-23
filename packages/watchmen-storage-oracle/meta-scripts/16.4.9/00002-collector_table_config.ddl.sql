CREATE TABLE collector_table_config
(
    config_id           VARCHAR2(50)     NOT NULL,
    name                VARCHAR2(50)     NOT NULL,
    table_name          VARCHAR2(50)     NOT NULL,
    primary_key         CLOB             NOT NULL,
    object_key          VARCHAR2(50),
    sequence_key        VARCHAR2(50),
    model_name          VARCHAR2(50)     NOT NULL,
    parent_name         VARCHAR2(50),
    label               VARCHAR2(50),
    join_keys           CLOB,
	depend_on           CLOB,
	audit_column        VARCHAR2(50)     NOT NULL,
	conditions          CLOB,
    data_source_id      VARCHAR2(50)     NOT NULL,
    is_list             NUMBER(1)        NOT NULL,
    triggered           NUMBER(1)        NOT NULL,
    version             NUMBER(8),
    tenant_id           VARCHAR2(50)     NOT NULL,
    created_at          DATE             NOT NULL,
    created_by          VARCHAR2(50)     NOT NULL,
    last_modified_at    DATE             NOT NULL,
    last_modified_by    VARCHAR2(50)     NOT NULL,
    CONSTRAINT pk_collector_table_config PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_collector_table_config_1 ON collector_table_config (name);
CREATE INDEX i_collector_table_config_1 ON collector_table_config (tenant_id);
CREATE INDEX i_collector_table_config_2 ON collector_table_config (created_at);
CREATE INDEX i_collector_table_config_3 ON collector_table_config (created_by);
CREATE INDEX i_collector_table_config_4 ON collector_table_config (last_modified_at);
CREATE INDEX i_collector_table_config_5 ON collector_table_config (last_modified_by);
