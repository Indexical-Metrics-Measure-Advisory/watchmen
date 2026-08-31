CREATE TABLE metric_versions
(
    id           VARCHAR(50) NOT NULL,
    metric_id    VARCHAR(50) NOT NULL,
    metric_name  VARCHAR(128) NOT NULL,
    version_no   INT NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    content      JSONB,
    comments     VARCHAR(1024),
    rollback_from_version_no INT,
    -- Auditable fields
    created_at   TIMESTAMP    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    -- OptimisticLock field
    version      BIGINT NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_metric_versions PRIMARY KEY (id)
);

CREATE INDEX ix_metric_versions_tenant_id ON metric_versions (tenant_id);
CREATE INDEX ix_metric_versions_metric_id ON metric_versions (metric_id);
CREATE INDEX ix_metric_versions_metric_name ON metric_versions (metric_name);
