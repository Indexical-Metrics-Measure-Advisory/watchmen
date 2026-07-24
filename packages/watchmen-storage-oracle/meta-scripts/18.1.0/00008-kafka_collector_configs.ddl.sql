CREATE TABLE kafka_collector_configs
(
    config_id            VARCHAR2(50)   NOT NULL,
    config_code          VARCHAR2(100)  NOT NULL,
    name                 VARCHAR2(255),
    batch_size           NUMBER(10)     DEFAULT 500 NOT NULL,
    bootstrap_servers    VARCHAR2(500),
    group_id             VARCHAR2(100)  DEFAULT 'Batch-Collector-Worker' NOT NULL,
    enable_auto_commit   NUMBER(1)      DEFAULT 0 NOT NULL,
    auto_offset_reset    VARCHAR2(20)   DEFAULT 'earliest' NOT NULL,
    topic_pattern        VARCHAR2(500),
    session_timeout_ms   NUMBER(10)     DEFAULT 30000 NOT NULL,
    max_poll_interval_ms NUMBER(10)     DEFAULT 300000 NOT NULL,
    tenant_id            VARCHAR2(50)   NOT NULL,
    created_at           DATE           NOT NULL,
    created_by           VARCHAR2(50),
    last_modified_at     DATE,
    last_modified_by     VARCHAR2(50),
    version              NUMBER(10)     NOT NULL,
    CONSTRAINT pk_kafka_collector_configs PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_kafka_collector_configs_1 ON kafka_collector_configs (config_code, tenant_id);
CREATE INDEX i_kafka_collector_configs_1 ON kafka_collector_configs (tenant_id);
CREATE INDEX i_kafka_collector_configs_2 ON kafka_collector_configs (created_at);
CREATE INDEX i_kafka_collector_configs_3 ON kafka_collector_configs (last_modified_at);
