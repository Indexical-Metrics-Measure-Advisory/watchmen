CREATE TABLE plugins
(
    plugin_id        VARCHAR(50) NOT NULL,
    plugin_code      VARCHAR(50) NOT NULL,
    name             VARCHAR(255),
    type             VARCHAR(50) NOT NULL,
    apply_to         VARCHAR(50) NOT NULL,
    params           JSON,
    results          JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_plugins PRIMARY KEY (plugin_id)
);
CREATE UNIQUE INDEX u_plugins_1 ON plugins (plugin_code, tenant_id);
CREATE INDEX i_plugins_1 ON plugins (plugin_code);
CREATE INDEX i_plugins_2 ON plugins (type);
CREATE INDEX i_plugins_3 ON plugins (apply_to);
CREATE INDEX i_plugins_4 ON plugins (tenant_id);
CREATE INDEX i_plugins_5 ON plugins (created_at);
CREATE INDEX i_plugins_6 ON plugins (created_by);
CREATE INDEX i_plugins_7 ON plugins (last_modified_at);
CREATE INDEX i_plugins_8 ON plugins (last_modified_by);
