CREATE TABLE plugins
(
    plugin_id        VARCHAR2(50) NOT NULL,
    plugin_code      VARCHAR2(50) NOT NULL,
    name             VARCHAR2(255),
    type             VARCHAR2(50) NOT NULL,
    apply_to         VARCHAR2(50) NOT NULL,
    params           CLOB,
    results          CLOB,
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
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
