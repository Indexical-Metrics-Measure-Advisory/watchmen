CREATE TABLE materialization_runs
(
    run_id               VARCHAR(50)  NOT NULL,
    materialization_id   VARCHAR(50)  NOT NULL,
    materialization_name VARCHAR(200),
    metric_name          VARCHAR(255),
    flow_id              VARCHAR(50),
    flow_name            VARCHAR(200),
    status               VARCHAR(10)  NOT NULL,
    trigger_type         VARCHAR(10)  NOT NULL,
    engine               VARCHAR(20)  NOT NULL,
    window_start         DATE,
    window_end           DATE,
    row_count            INTEGER,
    duration_ms          INTEGER,
    error_message        TEXT,
    sql_preview          TEXT,
    started_at           TIMESTAMP,
    finished_at          TIMESTAMP,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_materialization_runs PRIMARY KEY (run_id)
);
CREATE INDEX i_materialization_runs_1 ON materialization_runs (materialization_id);
CREATE INDEX i_materialization_runs_2 ON materialization_runs (status);
CREATE INDEX i_materialization_runs_3 ON materialization_runs (started_at);
CREATE INDEX i_materialization_runs_4 ON materialization_runs (flow_id);
CREATE INDEX i_materialization_runs_5 ON materialization_runs (tenant_id);
