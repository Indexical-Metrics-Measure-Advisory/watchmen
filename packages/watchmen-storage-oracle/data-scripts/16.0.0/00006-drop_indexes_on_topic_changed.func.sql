CREATE OR REPLACE PROCEDURE DROP_INDEXES_ON_TOPIC_CHANGED(topic_name IN VARCHAR2)
    IS
    CURSOR cursor_indexes IS
        SELECT UI.INDEX_NAME
        FROM USER_INDEXES UI
        WHERE UI.TABLE_NAME = UPPER(topic_name)
          AND NOT EXISTS(SELECT 1
                         FROM USER_CONSTRAINTS
                         WHERE TABLE_NAME = UPPER(topic_name)
                           AND CONSTRAINT_TYPE = 'P'
                           AND CONSTRAINT_NAME = UI.INDEX_NAME);
BEGIN
    FOR an_index in cursor_indexes
        LOOP
            EXECUTE IMMEDIATE CONCAT('DROP INDEX ', an_index.INDEX_NAME);
        END LOOP;
END;
