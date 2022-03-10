CREATE TABLE snowflake_competitive_workers
(
    ip             VARCHAR2(100),
    process_id     VARCHAR2(60),
    data_center_id NUMBER(3) NOT NULL,
    worker_id      NUMBER(4) NOT NULL,
    registered_at  DATE      NOT NULL,
    last_beat_at   DATE      NOT NULL,
    CONSTRAINT pk_snowflake_competitive_workers PRIMARY KEY (data_center_id, worker_id)
);
