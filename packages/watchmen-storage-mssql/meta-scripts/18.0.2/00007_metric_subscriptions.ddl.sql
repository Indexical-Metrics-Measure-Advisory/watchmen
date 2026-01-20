CREATE TABLE metric_subscriptions (
    id NVARCHAR(50) NOT NULL,
    analysis_id NVARCHAR(50) NOT NULL,
    frequency NVARCHAR(20) NOT NULL,
    [interval] INT,
    time NVARCHAR(10),
    [date] NVARCHAR(20),
    weekday NVARCHAR(10),
    day_of_month INT,
    month NVARCHAR(10),
    recipients NVARCHAR(MAX),
    enabled SMALLINT DEFAULT 1,
    tenant_id NVARCHAR(50) NOT NULL,
    user_id NVARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_metric_subscriptions PRIMARY KEY (id)
);
CREATE INDEX index_subscription_analysis_id ON metric_subscriptions (analysis_id);
CREATE INDEX index_subscription_tenant_id ON metric_subscriptions (tenant_id);
CREATE INDEX index_subscription_user_id ON metric_subscriptions (user_id);
