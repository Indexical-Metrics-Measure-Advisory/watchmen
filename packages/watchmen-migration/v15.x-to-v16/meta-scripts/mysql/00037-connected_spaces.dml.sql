DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_CONNECT_IDS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_CONNECT_IDS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_connect_id VARCHAR(50);
    DECLARE v_subject_ids LONGTEXT DEFAULT NULL;
    DECLARE subject_id_index INT UNSIGNED DEFAULT 0;
    DECLARE subject_ids_count INT UNSIGNED DEFAULT 0;
    DECLARE current_item LONGTEXT DEFAULT NULL;
    DECLARE cur_list CURSOR FOR SELECT connect_id, subjectids FROM connected_spaces WHERE subjectids IS NOT NULL AND subjectids != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_list;
    read_loop :
    LOOP
        FETCH cur_list INTO v_connect_id, v_subject_ids;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET subject_id_index := 0;
        SET subject_ids_count := JSON_LENGTH(v_subject_ids);

        WHILE subject_id_index < subject_ids_count
            DO
                SET current_item := JSON_EXTRACT(v_subject_ids, CONCAT('$[', subject_id_index, ']'));
                SET @subject_id = TRIM(BOTH '"' FROM current_item);

                SET @sql_update = CONCAT(
                        'UPDATE reports SET connect_id = \'', v_connect_id, '\' WHERE subject_id = \'', @subject_id, '\'');
                PREPARE a_sql FROM @sql_update;
                EXECUTE a_sql;
                SET @sql_update = CONCAT(
                        'UPDATE subjects SET connect_id = \'', v_connect_id, '\' WHERE subject_id = \'', @subject_id, '\'');
                PREPARE a_sql FROM @sql_update;
                EXECUTE a_sql;
                COMMIT;
                SET subject_id_index := subject_id_index + 1;
            END WHILE;
    END LOOP read_loop;
    CLOSE cur_list;
END|
DELIMITER ;
CALL WATCHMEN_MIGRATION_COPY_CONNECT_IDS();
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_CONNECT_IDS;
UPDATE connected_spaces SET created_at = NOW(), created_by = '-1', last_modified_at = NOW(), last_modified_by = '-1';
