ALTER TABLE objective_analysis
    DROP user_id;
ALTER TABLE objective_analysis
    DROP last_visit_time;
ALTER TABLE objective_analysis
    ADD version BIGINT DEFAULT 1 NOT NULL;
