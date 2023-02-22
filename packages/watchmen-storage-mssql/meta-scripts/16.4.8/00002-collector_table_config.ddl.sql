CREATE TABLE collector_table_config
(
    config_id           NVARCHAR(50)     NOT NULL,
    name                NVARCHAR(50)     NOT NULL,
    table_name          NVARCHAR(50)     NOT NULL,
    primary_key         NVARCHAR(MAX)    NOT NULL,
    object_key          NVARCHAR(50),
    sequence_key        NVARCHAR(50),
    model_name          NVARCHAR(50)     NOT NULL,
    parent_name         NVARCHAR(50),
    label               NVARCHAR(50),
    join_keys           NVARCHAR(MAX),
	depend_on           NVARCHAR(MAX),
	audit_column        NVARCHAR(50)     NOT NULL,
	conditions          NVARCHAR(MAX),
    data_source_id      NVARCHAR(50)     NOT NULL,
    is_list             TINYINT          NOT NULL,
    triggered           TINYINT          NOT NULL,
    version             DECIMAL(20),
    tenant_id           NVARCHAR(50)     NOT NULL,
    created_at          DATETIME         NOT NULL,
    created_by          NVARCHAR(50)     NOT NULL,
    last_modified_at    DATETIME         NOT NULL,
    last_modified_by    NVARCHAR(50)     NOT NULL,
    CONSTRAINT pk_collector_table_config PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_collector_table_config_1 ON collector_table_config (name);
CREATE INDEX i_collector_table_config_1 ON collector_table_config (tenant_id);
CREATE INDEX i_collector_table_config_2 ON collector_table_config (created_at);
CREATE INDEX i_collector_table_config_3 ON collector_table_config (created_by);
CREATE INDEX i_collector_table_config_4 ON collector_table_config (last_modified_at);
CREATE INDEX i_collector_table_config_5 ON collector_table_config (last_modified_by);
