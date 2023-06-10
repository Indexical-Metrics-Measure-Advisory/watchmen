CREATE TABLE collector_module_config
(
    module_id           VARCHAR2(50)     NOT NULL,
    module_name         VARCHAR2(50)     NOT NULL,
    priority            NUMBER(20)       NOT NULL,
    version             NUMBER(20),
    tenant_id           VARCHAR2(50)     NOT NULL,
    created_at          DATE             NOT NULL,
    created_by          VARCHAR2(50)     NOT NULL,
    last_modified_at    DATE             NOT NULL,
    last_modified_by    VARCHAR2(50)     NOT NULL,
    CONSTRAINT pk_collector_module_config PRIMARY KEY (module_id)
);
CREATE UNIQUE INDEX u_collector_module_config_1 ON collector_module_config (module_name);
CREATE INDEX i_collector_module_config_2 ON collector_module_config (tenant_id);
CREATE INDEX i_collector_module_config_3 ON collector_module_config (created_at);
CREATE INDEX i_collector_module_config_4 ON collector_module_config (created_by);
CREATE INDEX i_collector_module_config_5 ON collector_module_config (last_modified_at);
CREATE INDEX i_collector_module_config_6 ON collector_module_config (last_modified_by);