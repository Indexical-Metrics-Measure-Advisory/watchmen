CREATE TABLE kafka_collector_configs
(
    config_id            VARCHAR(50)   NOT NULL,
    config_code          VARCHAR(100)  NOT NULL,
    name                 VARCHAR(255),
    batch_size           INTEGER       NOT NULL DEFAULT 500,
    bootstrap_servers    VARCHAR(500),
    group_id             VARCHAR(100)  NOT NULL DEFAULT 'Batch-Collector-Worker',
    enable_auto_commit   SMALLINT      NOT NULL DEFAULT 0,
    auto_offset_reset    VARCHAR(20)   NOT NULL DEFAULT 'earliest',
    topic_pattern        VARCHAR(500),
    session_timeout_ms   INTEGER       NOT NULL DEFAULT 30000,
    max_poll_interval_ms INTEGER       NOT NULL DEFAULT 300000,
    tenant_id            VARCHAR(50)   NOT NULL,
    created_at           TIMESTAMP     NOT NULL,
    created_by           VARCHAR(50),
    last_modified_at     TIMESTAMP,
    last_modified_by     VARCHAR(50),
    version              INTEGER       NOT NULL,
    CONSTRAINT pk_kafka_collector_configs PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_kafka_collector_configs_1 ON kafka_collector_configs (config_code, tenant_id);
CREATE INDEX i_kafka_collector_configs_1 ON kafka_collector_configs (tenant_id);
CREATE INDEX i_kafka_collector_configs_2 ON kafka_collector_configs (created_at);
CREATE INDEX i_kafka_collector_configs_3 ON kafka_collector_configs (last_modified_at);
