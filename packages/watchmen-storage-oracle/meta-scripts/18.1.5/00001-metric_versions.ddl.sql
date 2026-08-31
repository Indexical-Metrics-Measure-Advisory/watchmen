CREATE TABLE metric_versions
(
    id           VARCHAR2(50) NOT NULL,
    metric_id    VARCHAR2(50) NOT NULL,
    metric_name  VARCHAR2(128) NOT NULL,
    version_no   NUMBER(10) NOT NULL,
    operation_type VARCHAR2(20) NOT NULL,
    content      CLOB,
    comments     VARCHAR2(1024),
    rollback_from_version_no NUMBER(10),
    created_at   DATE    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    last_modified_at   DATE    NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    version      NUMBER(20) NOT NULL,
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_metric_versions PRIMARY KEY (id)
);

CREATE INDEX ix_metric_versions_tenant_id ON metric_versions (tenant_id);
CREATE INDEX ix_metric_versions_metric_id ON metric_versions (metric_id);
CREATE INDEX ix_metric_versions_metric_name ON metric_versions (metric_name);
