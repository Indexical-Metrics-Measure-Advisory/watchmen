-- noinspection SqlResolveForFile
RENAME TABLE snowflake_workerid TO snowflake_competitive_workers;
ALTER TABLE snowflake_competitive_workers
    DROP PRIMARY KEY;
TRUNCATE TABLE snowflake_competitive_workers;
ALTER TABLE snowflake_competitive_workers
    CHANGE processid process_id VARCHAR(60) NULL;
ALTER TABLE snowflake_competitive_workers
    ADD data_center_id INT(3) NULL;
ALTER TABLE snowflake_competitive_workers
    CHANGE workerid worker_id INT(4) NULL;
ALTER TABLE snowflake_competitive_workers
    CHANGE regdate registered_at DATETIME NOT NULL;
ALTER TABLE snowflake_competitive_workers
    ADD last_beat_at DATETIME NOT NULL;
ALTER TABLE snowflake_competitive_workers
    ADD PRIMARY KEY (data_center_id, worker_id);
