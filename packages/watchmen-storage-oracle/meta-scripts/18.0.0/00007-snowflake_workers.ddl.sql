CREATE TABLE snowflake_workers
(
    data_center_id SMALLINT   NOT NULL,
    worker_id      SMALLINT   NOT NULL,
    registered_at  TIMESTAMP  NOT NULL,
    last_beat_at   TIMESTAMP  NOT NULL,
    locked         SMALLINT   NOT NULL,
    CONSTRAINT pk_snowflake_workers PRIMARY KEY (data_center_id, worker_id)
);