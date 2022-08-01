ALTER TABLE inspections
    DROP COLUMN user_id;
ALTER TABLE inspections
    ADD version DECIMAL(20) DEFAULT 1 NOT NULL;
