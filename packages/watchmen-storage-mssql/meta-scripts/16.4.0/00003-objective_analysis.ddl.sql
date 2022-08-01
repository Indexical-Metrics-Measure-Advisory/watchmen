DROP INDEX [i_objective_analysis_2] ON [objective_analysis];
ALTER TABLE objective_analysis
    DROP COLUMN user_id;
ALTER TABLE objective_analysis
    DROP COLUMN last_visit_time;