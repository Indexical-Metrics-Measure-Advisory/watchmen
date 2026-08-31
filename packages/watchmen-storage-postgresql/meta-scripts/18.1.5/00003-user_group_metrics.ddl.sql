ALTER TABLE user_groups DROP COLUMN metric_ids;

CREATE TABLE user_group_metrics
(
    user_group_metric_id VARCHAR(50) NOT NULL,
    user_group_id VARCHAR(50) NOT NULL,
    metric_id VARCHAR(50) NOT NULL,
    -- Auditable fields
    created_at   TIMESTAMP    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    -- OptimisticLock field
    version      BIGINT NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_user_group_metrics PRIMARY KEY (user_group_metric_id)
);

CREATE INDEX ix_user_group_metrics_tenant_id ON user_group_metrics (tenant_id);
CREATE INDEX ix_user_group_metrics_user_group_id ON user_group_metrics (user_group_id);
CREATE INDEX ix_user_group_metrics_metric_id ON user_group_metrics (metric_id);
