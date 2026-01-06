CREATE TABLE metric_subscriptions (
    id VARCHAR2(50) NOT NULL,
    analysis_id VARCHAR2(50) NOT NULL,
    frequency VARCHAR2(20) NOT NULL,
    "interval" NUMBER(10),
    time VARCHAR2(10),
    "date" VARCHAR2(20),
    weekday VARCHAR2(10),
    day_of_month NUMBER(10),
    month VARCHAR2(10),
    recipients CLOB,
    enabled NUMBER(1) DEFAULT 1,
    tenant_id VARCHAR2(50) NOT NULL,
    user_id VARCHAR2(50) NOT NULL,
    created_at DATE NOT NULL,
    created_by VARCHAR2(50) NOT NULL,
    last_modified_at DATE NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_metric_subscriptions PRIMARY KEY (id)
);
CREATE INDEX index_subscription_analysis_id ON metric_subscriptions (analysis_id);
CREATE INDEX index_subscription_tenant_id ON metric_subscriptions (tenant_id);
CREATE INDEX index_subscription_user_id ON metric_subscriptions (user_id);
