-- noinspection SqlResolveForFile
ALTER TABLE snowflake_workerid RENAME TO snowflake_competitive_workers;
ALTER TABLE snowflake_competitive_workers
    DROP CONSTRAINT snowflake_workerid_pk;
TRUNCATE TABLE snowflake_competitive_workers;
ALTER TABLE snowflake_competitive_workers RENAME COLUMN processid TO process_id;
ALTER TABLE snowflake_competitive_workers
    MODIFY process_id VARCHAR2(60) NULL;
ALTER TABLE snowflake_competitive_workers
    ADD data_center_id NUMBER(3) NULL;
ALTER TABLE snowflake_competitive_workers RENAME COLUMN workerid TO worker_id;
ALTER TABLE snowflake_competitive_workers
    MODIFY worker_id NUMBER(4);
ALTER TABLE snowflake_competitive_workers RENAME COLUMN regdate TO registered_at;
ALTER TABLE snowflake_competitive_workers
    MODIFY registered_at DATE NOT NULL;
ALTER TABLE snowflake_competitive_workers
    ADD last_beat_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE snowflake_competitive_workers
    ADD CONSTRAINT pk_snowflake_competitive_workers PRIMARY KEY (data_center_id, worker_id);
