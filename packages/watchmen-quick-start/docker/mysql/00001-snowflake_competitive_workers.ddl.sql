CREATE TABLE snowflake_competitive_workers
(
    ip             VARCHAR(100),
    process_id     VARCHAR(60),
    data_center_id INT(3)   NOT NULL,
    worker_id      INT(4)   NOT NULL,
    registered_at  DATETIME NOT NULL,
    last_beat_at   DATETIME NOT NULL,
    PRIMARY KEY (data_center_id, worker_id)
);
