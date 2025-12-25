CREATE TABLE snowflake_competitive_workers
(
    ip             VARCHAR(100),
    process_id     VARCHAR(60),
    data_center_id DECIMAL(3) NOT NULL,
    worker_id      DECIMAL(4) NOT NULL,
    registered_at  TIMESTAMP  NOT NULL,
    last_beat_at   TIMESTAMP  NOT NULL,
    CONSTRAINT pk_snowflake_competitive_workers PRIMARY KEY (data_center_id, worker_id)
);
