
CREATE TABLE collector_batch_config_log
(
    log_id               BIGINT       NOT NULL,
    tran_id              BIGINT       NOT NULL,
    pipeline_id          VARCHAR(50)  NOT NULL,
    action_id            VARCHAR(50),
    status               SMALLINT     NOT NULL,
    action               JSON,
    error                JSON,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_collector_batch_config_log PRIMARY KEY (log_id)
);

CREATE INDEX i_collector_batch_config_log_4 ON collector_batch_config_log (tran_id);
CREATE INDEX i_collector_batch_config_log_5 ON collector_batch_config_log (tenant_id);
CREATE INDEX i_collector_batch_config_log_6 ON collector_batch_config_log (created_at);
CREATE INDEX i_collector_batch_config_log_7 ON collector_batch_config_log (created_by);
CREATE INDEX i_collector_batch_config_log_8 ON collector_batch_config_log (last_modified_at);
CREATE INDEX i_collector_batch_config_log_9 ON collector_batch_config_log (last_modified_by);
