CREATE TABLE data_profiles
(
    id           VARCHAR(50) NOT NULL,
    name         VARCHAR(128) NOT NULL,
    target       VARCHAR(128) NOT NULL,
    outputs      NVARCHAR(MAX) NOT NULL,
    description  NVARCHAR(MAX),
    -- Auditable fields
    created_at   DATETIME2    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME2    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    -- OptimisticLock field
    version      BIGINT NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_data_profiles PRIMARY KEY (id)
);

CREATE INDEX ix_data_profiles_tenant_id ON data_profiles (tenant_id);
CREATE INDEX ix_data_profiles_name ON data_profiles (name);
CREATE INDEX ix_data_profiles_target ON data_profiles (target);
-- Full-text search index for MSSQL (requires FULLTEXT catalog to be created first)
-- CREATE FULLTEXT INDEX ON data_profiles (description) KEY INDEX pk_data_profiles;