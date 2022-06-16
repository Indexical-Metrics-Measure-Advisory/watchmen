-- noinspection SqlResolveForFile
ALTER TABLE console_space_subjects RENAME TO subjects;
ALTER TABLE subjects RENAME COLUMN subjectid TO subject_id;
ALTER TABLE subjects
    MODIFY subject_id VARCHAR2(50);
ALTER TABLE subjects
    MODIFY name VARCHAR2(50);
ALTER TABLE subjects
    DROP COLUMN topiccount;
ALTER TABLE subjects
    DROP COLUMN graphicscount;
ALTER TABLE subjects
    DROP COLUMN reports;
ALTER TABLE subjects
    ADD connect_id VARCHAR2(50) NULL;
ALTER TABLE subjects
    ADD auto_refresh_interval NUMBER(20) NULL;
ALTER TABLE subjects
    ADD user_id VARCHAR2(50) NULL;
ALTER TABLE subjects RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE subjects
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE subjects RENAME COLUMN lastvisittime TO last_visit_time;
ALTER TABLE subjects
    MODIFY last_visit_time DATE NOT NULL;
ALTER TABLE subjects
    DROP COLUMN createdat;
ALTER TABLE subjects
    DROP COLUMN lastmodified;
ALTER TABLE subjects
    DROP COLUMN createtime;
ALTER TABLE subjects
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE subjects
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE subjects
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE subjects
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
CREATE INDEX i_subjects_created_at ON subjects (created_at);
CREATE INDEX i_subjects_created_by ON subjects (created_by);
CREATE INDEX i_subjects_last_modified_at ON subjects (last_modified_at);
CREATE INDEX i_subjects_last_modified_by ON subjects (last_modified_by);
CREATE INDEX i_subjects_name ON subjects (name);
CREATE INDEX i_subjects_tenant_id ON subjects (tenant_id);
CREATE INDEX i_subjects_user_id ON subjects (user_id);
CREATE OR REPLACE PROCEDURE WATCHMEN_MIGRATION_COPY_SUBJECT_IDS IS
    CURSOR cur_list IS SELECT subject_id, reportids
                       FROM subjects
                       WHERE reportids IS NOT NULL;
    report_ids JSON_ARRAY_T;
    report_id  VARCHAR2(50);
BEGIN
    FOR a_subject in cur_list
        LOOP
            report_ids := JSON_ARRAY_T(a_subject.reportids);
            FOR item_index IN 0 .. report_ids.GET_SIZE() - 1
                LOOP
                    report_id := report_ids.GET_STRING(item_index);
                    report_id := TRIM(BOTH '"' FROM report_id);
                    EXECUTE IMMEDIATE 'UPDATE reports SET subject_id = ''' || a_subject.subject_id ||
                                      ''' WHERE report_id = ''' || report_id || '''';
                    COMMIT;
                END LOOP;
        END LOOP;
END;
CALL WATCHMEN_MIGRATION_COPY_SUBJECT_IDS();
DROP PROCEDURE WATCHMEN_MIGRATION_COPY_SUBJECT_IDS;
-- noinspection SqlWithoutWhere
UPDATE subjects
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1';
ALTER TABLE subjects
    DROP COLUMN reportids;
