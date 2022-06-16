-- noinspection SqlResolveForFile
RENAME TABLE console_spaces TO connected_spaces;
ALTER TABLE connected_spaces
    CHANGE connectid connect_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_spaces
    CHANGE spaceid space_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_spaces
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE connected_spaces
    DROP type;
ALTER TABLE connected_spaces
    CHANGE istemplate is_template TINYINT(1) NOT NULL;
ALTER TABLE connected_spaces
    DROP subjects;
ALTER TABLE connected_spaces
    DROP groupids;
ALTER TABLE connected_spaces
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_spaces
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_spaces
    CHANGE lastvisittime last_visit_time DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE connected_spaces
    DROP createtime;
ALTER TABLE connected_spaces
    DROP lastmodified;
ALTER TABLE connected_spaces
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE connected_spaces
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE connected_spaces
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE connected_spaces
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
CREATE INDEX created_at ON connected_spaces (created_at);
CREATE INDEX created_by ON connected_spaces (created_by);
CREATE INDEX last_modified_at ON connected_spaces (last_modified_at);
CREATE INDEX last_modified_by ON connected_spaces (last_modified_by);
CREATE INDEX name ON connected_spaces (name);
CREATE INDEX space_id ON connected_spaces (space_id);
CREATE INDEX tenant_id ON connected_spaces (tenant_id);
CREATE INDEX user_id ON connected_spaces (user_id);
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_CONNECT_IDS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_CONNECT_IDS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_connect_id VARCHAR(50);
    DECLARE v_subject_ids LONGTEXT DEFAULT NULL;
    DECLARE v_user_id VARCHAR(50);
    DECLARE subject_id_index INT UNSIGNED DEFAULT 0;
    DECLARE subject_ids_count INT UNSIGNED DEFAULT 0;
    DECLARE current_item LONGTEXT DEFAULT NULL;
    DECLARE cur_list CURSOR FOR SELECT connect_id, subjectids, user_id
                                FROM connected_spaces
                                WHERE subjectids IS NOT NULL AND subjectids != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_list;
    read_loop :
    LOOP
        FETCH cur_list INTO v_connect_id, v_subject_ids, v_user_id;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET subject_id_index := 0;
        SET subject_ids_count := JSON_LENGTH(v_subject_ids);

        WHILE subject_id_index < subject_ids_count
            DO
                SELECT subject_id_index;
                SET current_item := JSON_EXTRACT(v_subject_ids, CONCAT('$[', subject_id_index, ']'));
                SET @subject_id = TRIM(BOTH '"' FROM current_item);
                SET @sql_update = CONCAT(
                        'UPDATE reports SET connect_id = \'', v_connect_id, '\', user_id = \'', v_user_id,
                        '\' WHERE subject_id = \'', @subject_id, '\'');
                PREPARE a_sql FROM @sql_update;
                EXECUTE a_sql;
                SET @sql_update = CONCAT(
                        'UPDATE subjects SET connect_id = \'', v_connect_id, '\', user_id = \'', v_user_id,
                        '\' WHERE subject_id = \'', @subject_id, '\'');
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
-- noinspection SqlWithoutWhere
UPDATE connected_spaces
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1';
ALTER TABLE connected_spaces
    DROP subjectids;
