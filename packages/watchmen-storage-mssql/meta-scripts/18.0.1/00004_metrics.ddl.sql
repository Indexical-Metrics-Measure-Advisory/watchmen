CREATE TABLE metrics
(
    id           VARCHAR(50) NOT NULL,
    name         VARCHAR(128) NOT NULL,
    description  NVARCHAR(MAX),
    type         VARCHAR(50) NOT NULL,
    categoryId     VARCHAR(50) ,
    type_params  NVARCHAR(MAX),
    filter       NVARCHAR(MAX),
    metadata     NVARCHAR(MAX),
    label        VARCHAR(255),
    config       NVARCHAR(MAX),
    time_granularity VARCHAR(50),
    -- Auditable fields
    created_at   DATETIME2    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME2    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    -- OptimisticLock field
    version      BIGINT NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_metrics PRIMARY KEY (id)
);

CREATE INDEX ix_metrics_tenant_id ON metrics (tenant_id);
CREATE INDEX ix_metrics_name ON metrics (name);
CREATE INDEX ix_metrics_type ON metrics (type);
CREATE INDEX ix_metrics_label ON metrics (label);
CREATE INDEX ix_metrics_time_granularity ON metrics (time_granularity);
