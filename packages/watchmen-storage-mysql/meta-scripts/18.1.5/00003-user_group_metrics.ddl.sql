-- drop the legacy inline column only when it exists (fresh installs never had it);
-- MySQL 8 has no DROP COLUMN IF EXISTS, so guard via information_schema
SET @drop_metric_ids = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_groups' AND COLUMN_NAME = 'metric_ids'),
    'ALTER TABLE user_groups DROP COLUMN metric_ids',
    'SELECT ''metric_ids absent, nothing to drop''');
PREPARE drop_metric_ids_stmt FROM @drop_metric_ids;
EXECUTE drop_metric_ids_stmt;
DEALLOCATE PREPARE drop_metric_ids_stmt;

CREATE TABLE user_group_metrics
(
    user_group_metric_id VARCHAR(50) NOT NULL,
    user_group_id VARCHAR(50) NOT NULL,
    metric_id VARCHAR(50) NOT NULL,
    -- Auditable fields
    created_at   DATETIME    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    -- OptimisticLock field
    version      DECIMAL(20) NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_user_group_metrics PRIMARY KEY (user_group_metric_id)
);

CREATE INDEX ix_user_group_metrics_tenant_id ON user_group_metrics (tenant_id);
CREATE INDEX ix_user_group_metrics_user_group_id ON user_group_metrics (user_group_id);
CREATE INDEX ix_user_group_metrics_metric_id ON user_group_metrics (metric_id);
