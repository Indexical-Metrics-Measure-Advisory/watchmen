ALTER TABLE objective_analysis
    DROP COLUMN user_id;
ALTER TABLE objective_analysis
    DROP COLUMN last_visit_time;
ALTER TABLE objective_analysis
    ADD version DECIMAL(20) DEFAULT 1 NOT NULL;
