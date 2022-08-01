ALTER TABLE achievements
    DROP COLUMN user_id;
ALTER TABLE achievements
    ADD version NUMBER(20) DEFAULT 1 NOT NULL;
