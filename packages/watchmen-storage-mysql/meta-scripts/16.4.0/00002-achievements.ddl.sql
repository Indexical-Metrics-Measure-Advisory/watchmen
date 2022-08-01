ALTER TABLE achievements
    DROP user_id;
ALTER TABLE achievements
    ADD version BIGINT DEFAULT 1 NOT NULL;
