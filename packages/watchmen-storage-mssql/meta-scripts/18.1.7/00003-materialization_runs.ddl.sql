CREATE TABLE materialization_runs
(
    run_id               NVARCHAR(50)  NOT NULL,
    materialization_id   NVARCHAR(50)  NOT NULL,
    materialization_name NVARCHAR(200),
    metric_name          NVARCHAR(255),
    flow_id              NVARCHAR(50),
    flow_name            NVARCHAR(200),
    status               NVARCHAR(10)  NOT NULL,
    trigger_type         NVARCHAR(10)  NOT NULL,
    engine               NVARCHAR(20)  NOT NULL,
    window_start         DATE,
    window_end           DATE,
    row_count            INT,
    duration_ms          INT,
    error_message        NVARCHAR(MAX),
    sql_preview          NVARCHAR(MAX),
    started_at           DATETIME,
    finished_at          DATETIME,
    tenant_id            NVARCHAR(50)  NOT NULL,
    created_at           DATETIME      NOT NULL,
    created_by           NVARCHAR(50)  NOT NULL,
    last_modified_at     DATETIME      NOT NULL,
    last_modified_by     NVARCHAR(50)  NOT NULL,
    CONSTRAINT pk_materialization_runs PRIMARY KEY (run_id)
);
CREATE INDEX i_materialization_runs_1 ON materialization_runs (materialization_id);
CREATE INDEX i_materialization_runs_2 ON materialization_runs (status);
CREATE INDEX i_materialization_runs_3 ON materialization_runs (started_at);
CREATE INDEX i_materialization_runs_4 ON materialization_runs (flow_id);
CREATE INDEX i_materialization_runs_5 ON materialization_runs (tenant_id);
