CREATE TABLE data_profiles
(
    id           VARCHAR2(50) NOT NULL,
    name         VARCHAR2(128) NOT NULL,
    target       VARCHAR2(128) NOT NULL,
    outputs      CLOB NOT NULL,
    description  CLOB,
    -- Auditable fields
    created_at   TIMESTAMP    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    -- OptimisticLock field
    version      NUMBER(19) NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_data_profiles PRIMARY KEY (id)
);

CREATE INDEX ix_data_profiles_tenant_id ON data_profiles (tenant_id);
CREATE INDEX ix_data_profiles_name ON data_profiles (name);
CREATE INDEX ix_data_profiles_target ON data_profiles (target);
-- Oracle Text index for description field (requires Oracle Text to be installed)
-- CREATE INDEX ix_data_profiles_description ON data_profiles (description) INDEXTYPE IS CTXSYS.CONTEXT;