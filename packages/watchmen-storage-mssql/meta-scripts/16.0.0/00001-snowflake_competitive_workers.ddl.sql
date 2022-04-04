CREATE TABLE snowflake_competitive_workers
(
    ip             NVARCHAR(100),
    process_id     NVARCHAR(60),
    data_center_id DECIMAL(3) NOT NULL,
    worker_id      DECIMAL(4) NOT NULL,
    registered_at  DATETIME   NOT NULL,
    last_beat_at   DATETIME   NOT NULL,
    CONSTRAINT pk_snowflake_competitive_workers PRIMARY KEY (data_center_id, worker_id)
);
