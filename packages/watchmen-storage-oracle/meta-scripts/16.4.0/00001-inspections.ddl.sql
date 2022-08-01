ALTER TABLE inspections
    DROP COLUMN user_id;
ALTER TABLE inspections
    ADD version NUMBER(20) DEFAULT 1 NOT NULL;
