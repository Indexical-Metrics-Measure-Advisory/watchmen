ALTER TABLE inspections
    DROP user_id;
ALTER TABLE inspections
    ADD version BIGINT DEFAULT 1 NOT NULL;
