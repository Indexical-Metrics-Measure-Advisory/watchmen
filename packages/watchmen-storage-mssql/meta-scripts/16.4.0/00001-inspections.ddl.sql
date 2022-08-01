DROP INDEX [i_inspections_3] ON [inspections];
ALTER TABLE inspections
    DROP COLUMN user_id;
