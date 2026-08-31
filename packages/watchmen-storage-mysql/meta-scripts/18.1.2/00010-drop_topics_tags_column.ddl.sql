-- drop the topics.tags column when it exists,
-- environments applied the previous column based tags solution need this cleanup,
-- tags are stored in the topic_tags relation now
SET @drop_tags_column_sql = IF(
    EXISTS(
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'topics'
          AND COLUMN_NAME = 'tags'
    ),
    'ALTER TABLE topics DROP COLUMN tags',
    'SELECT 1'
);
PREPARE drop_tags_column_stmt FROM @drop_tags_column_sql;
EXECUTE drop_tags_column_stmt;
DEALLOCATE PREPARE drop_tags_column_stmt;
