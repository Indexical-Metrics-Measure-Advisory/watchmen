CREATE TABLE metrics
(
    id           VARCHAR2(50) NOT NULL,
    name         VARCHAR2(128) NOT NULL,
    description  CLOB,
    type         VARCHAR2(50) NOT NULL,
    type_params  CLOB,
    filter       CLOB,
    metadata     CLOB,
    label        VARCHAR2(255),
    config       CLOB,
    time_granularity VARCHAR2(50),
    -- Auditable fields
    created_at   TIMESTAMP    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    -- OptimisticLock field
    version      NUMBER(19) NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_metrics PRIMARY KEY (id)
);

CREATE INDEX ix_metrics_tenant_id ON metrics (tenant_id);
CREATE INDEX ix_metrics_name ON metrics (name);
CREATE INDEX ix_metrics_type ON metrics (type);
CREATE INDEX ix_metrics_label ON metrics (label);
CREATE INDEX ix_metrics_time_granularity ON metrics (time_granularity);
