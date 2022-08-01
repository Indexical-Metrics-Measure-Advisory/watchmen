DROP INDEX [i_achievements_2] ON [achievements];
ALTER TABLE achievements
    DROP COLUMN user_id;
ALTER TABLE achievements
    ADD version DECIMAL(20) DEFAULT 1 NOT NULL;
