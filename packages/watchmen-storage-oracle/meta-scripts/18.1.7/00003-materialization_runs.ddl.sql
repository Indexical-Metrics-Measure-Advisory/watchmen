CREATE TABLE materialization_runs
(
    run_id               VARCHAR2(50)  NOT NULL,
    materialization_id   VARCHAR2(50)  NOT NULL,
    materialization_name VARCHAR2(200),
    metric_name          VARCHAR2(255),
    flow_id              VARCHAR2(50),
    flow_name            VARCHAR2(200),
    status               VARCHAR2(10)  NOT NULL,
    trigger_type         VARCHAR2(10)  NOT NULL,
    engine               VARCHAR2(20)  NOT NULL,
    window_start         DATE,
    window_end           DATE,
    row_count            NUMBER(10),
    duration_ms          NUMBER(10),
    error_message        CLOB,
    sql_preview          CLOB,
    started_at           DATE,
    finished_at          DATE,
    tenant_id            VARCHAR2(50)  NOT NULL,
    created_at           DATE          NOT NULL,
    created_by           VARCHAR2(50)  NOT NULL,
    last_modified_at     DATE          NOT NULL,
    last_modified_by     VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_materialization_runs PRIMARY KEY (run_id)
);
CREATE INDEX i_materialization_runs_1 ON materialization_runs (materialization_id);
CREATE INDEX i_materialization_runs_2 ON materialization_runs (status);
CREATE INDEX i_materialization_runs_3 ON materialization_runs (started_at);
CREATE INDEX i_materialization_runs_4 ON materialization_runs (flow_id);
CREATE INDEX i_materialization_runs_5 ON materialization_runs (tenant_id);
