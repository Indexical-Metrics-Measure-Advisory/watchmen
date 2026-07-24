CREATE TABLE kafka_collector_configs
(
    config_id            NVARCHAR(50)   NOT NULL,
    config_code          NVARCHAR(100)  NOT NULL,
    name                 NVARCHAR(255),
    batch_size           INTEGER        NOT NULL DEFAULT 500,
    bootstrap_servers    NVARCHAR(500),
    group_id             NVARCHAR(100)  NOT NULL DEFAULT 'Batch-Collector-Worker',
    enable_auto_commit   TINYINT        NOT NULL DEFAULT 0,
    auto_offset_reset    NVARCHAR(20)   NOT NULL DEFAULT 'earliest',
    topic_pattern        NVARCHAR(500),
    session_timeout_ms   INTEGER        NOT NULL DEFAULT 30000,
    max_poll_interval_ms INTEGER        NOT NULL DEFAULT 300000,
    tenant_id            NVARCHAR(50)   NOT NULL,
    created_at           DATETIME       NOT NULL,
    created_by           NVARCHAR(50),
    last_modified_at     DATETIME,
    last_modified_by     NVARCHAR(50),
    version              INTEGER        NOT NULL,
    CONSTRAINT pk_kafka_collector_configs PRIMARY KEY (config_id)
);
CREATE UNIQUE INDEX u_kafka_collector_configs_1 ON kafka_collector_configs (config_code, tenant_id);
CREATE INDEX i_kafka_collector_configs_1 ON kafka_collector_configs (tenant_id);
CREATE INDEX i_kafka_collector_configs_2 ON kafka_collector_configs (created_at);
CREATE INDEX i_kafka_collector_configs_3 ON kafka_collector_configs (last_modified_at);
