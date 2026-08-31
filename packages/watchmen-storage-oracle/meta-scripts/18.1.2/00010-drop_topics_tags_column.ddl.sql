-- drop the topics.tags column when it exists,
-- environments applied the previous column based tags solution need this cleanup,
-- tags are stored in the topic_tags relation now
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(1)
    INTO column_count
    FROM USER_TAB_COLUMNS
    WHERE TABLE_NAME = 'TOPICS'
      AND COLUMN_NAME = 'TAGS';
    IF column_count > 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE topics DROP COLUMN tags';
    END IF;
END;
/
