-- noinspection SqlResolveForFile
RENAME TABLE console_space_subjects TO subjects;
ALTER TABLE subjects
    CHANGE subjectid subject_id VARCHAR(50) NOT NULL;
ALTER TABLE subjects
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE subjects
    DROP topiccount;
ALTER TABLE subjects
    DROP graphicscount;
ALTER TABLE subjects
    DROP reports;
ALTER TABLE subjects
    ADD connect_id VARCHAR(50) NOT NULL;
ALTER TABLE subjects
    ADD auto_refresh_interval BIGINT NULL;
ALTER TABLE subjects
    ADD user_id VARCHAR(50) NOT NULL;
ALTER TABLE subjects
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE subjects
    CHANGE lastvisittime last_visit_time DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE subjects
    DROP createdat;
ALTER TABLE subjects
    DROP lastmodified;
ALTER TABLE subjects
    DROP createtime;
ALTER TABLE subjects
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE subjects
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE subjects
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE subjects
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
CREATE INDEX created_at ON subjects (created_at);
CREATE INDEX created_by ON subjects (created_by);
CREATE INDEX last_modified_at ON subjects (last_modified_at);
CREATE INDEX last_modified_by ON subjects (last_modified_by);
CREATE INDEX name ON subjects (name);
CREATE INDEX tenant_id ON subjects (tenant_id);
CREATE INDEX user_id ON subjects (user_id);
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_SUBJECT_IDS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_SUBJECT_IDS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_subject_id VARCHAR(50);
    DECLARE v_report_ids LONGTEXT DEFAULT NULL;
    DECLARE report_id_index INT UNSIGNED DEFAULT 0;
    DECLARE report_ids_count INT UNSIGNED DEFAULT 0;
    DECLARE current_item LONGTEXT DEFAULT NULL;
    DECLARE cur_list CURSOR FOR SELECT subject_id, reportids
                                FROM subjects
                                WHERE reportids IS NOT NULL AND reportids != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_list;
    read_loop :
    LOOP
        FETCH cur_list INTO v_subject_id, v_report_ids;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET report_id_index := 0;
        SET report_ids_count := JSON_LENGTH(v_report_ids);

        WHILE report_id_index < report_ids_count
            DO
                SET current_item := JSON_EXTRACT(v_report_ids, CONCAT('$[', report_id_index, ']'));
                SET @report_id = TRIM(BOTH '"' FROM current_item);

                SET @sql_update = CONCAT(
                        'UPDATE reports SET subject_id = \'', v_subject_id, '\' WHERE report_id = \'', @report_id,
                        '\'');
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
-- noinspection SqlWithoutWhere
UPDATE subjects
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1';
ALTER TABLE subjects
    DROP reportids;
