CREATE TABLE metric_subscriptions (
    id VARCHAR(50) NOT NULL,
    analysis_id VARCHAR(50) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    "interval" INT,
    time VARCHAR(10),
    date VARCHAR(20),
    weekday VARCHAR(10),
    day_of_month INT,
    month VARCHAR(10),
    recipients JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    tenant_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    PRIMARY KEY (id)
);
CREATE INDEX index_subscription_analysis_id ON metric_subscriptions (analysis_id);
CREATE INDEX index_subscription_tenant_id ON metric_subscriptions (tenant_id);
CREATE INDEX index_subscription_user_id ON metric_subscriptions (user_id);
