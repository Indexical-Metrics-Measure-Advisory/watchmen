DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_SUBJECT_IDS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_SUBJECT_IDS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_subject_id VARCHAR2(50);
    DECLARE v_report_ids LONGTEXT DEFAULT NULL;
    DECLARE report_id_index INT UNSIGNED DEFAULT 0;
    DECLARE report_ids_count INT UNSIGNED DEFAULT 0;
    DECLARE current_item LONGTEXT DEFAULT NULL;
    DECLARE cur_list CURSOR FOR SELECT subject_id, reportids FROM subjects WHERE reportids IS NOT NULL AND reportids != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_list;
    read_loop :
    LOOP
        FETCH cur_list INTO v_subject_id, v_report_ids;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET report_id_index := 0;
        SET report_ids_count := CLOB_LENGTH(v_report_ids);

        WHILE report_id_index < report_ids_count
            DO
                SET current_item := CLOB_EXTRACT(v_report_ids, CONCAT('$[', report_id_index, ']'));
                SET @report_id = TRIM(BOTH '"' FROM current_item);

                SET @sql_update = CONCAT(
                        'UPDATE reports SET subject_id = \'', v_subject_id, '\' WHERE report_id = \'', @report_id, '\'');
                PREPARE a_sql FROM @sql_update;
                EXECUTE a_sql;
                COMMIT;
                SET report_id_index := report_id_index + 1;
            END WHILE;
    END LOOP read_loop;
    CLOSE cur_list;
END|
DELIMITER ;
CALL WATCHMEN_MIGRATION_COPY_SUBJECT_IDS();
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_SUBJECT_IDS;
UPDATE subjects SET created_at = SYSDATE, created_by = '-1', last_modified_at = SYSDATE, last_modified_by = '-1';
