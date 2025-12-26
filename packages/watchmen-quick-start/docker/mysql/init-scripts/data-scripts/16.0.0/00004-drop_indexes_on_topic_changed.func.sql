DROP PROCEDURE IF EXISTS DROP_INDEXES_ON_TOPIC_CHANGED;

DELIMITER |
CREATE PROCEDURE DROP_INDEXES_ON_TOPIC_CHANGED(topic_name VARCHAR(100))
BEGIN
    DECLARE CurrentDatabase VARCHAR(100);

    SELECT DATABASE() INTO CurrentDatabase;

    -- drop existed indexes
    -- simply uncomment the following loop to drop all exists indexes
    -- considering performance of rebuild indexes, manually drop useless indexes accurate is recommended.
    -- according to duplication check of index names, following create scripts need to be adjusted manually as well.
    SELECT COUNT(1)
    INTO @indexCount
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = CurrentDatabase
      AND TABLE_NAME = topic_name
      AND INDEX_NAME <> 'PRIMARY'
    LIMIT 1;
    WHILE @indexCount != 0
        DO
            SELECT INDEX_NAME
            INTO @indexName
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = CurrentDatabase
              AND TABLE_NAME = topic_name
              AND INDEX_NAME <> 'PRIMARY'
            LIMIT 1;
            SET @sql = concat('DROP INDEX ', @indexName, ' ON ', topic_name, ';');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            SELECT COUNT(1)
            INTO @indexCount
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = CurrentDatabase
              AND TABLE_NAME = topic_name
              AND INDEX_NAME <> 'PRIMARY'
            LIMIT 1;
        END WHILE;
END|
DELIMITER ;
