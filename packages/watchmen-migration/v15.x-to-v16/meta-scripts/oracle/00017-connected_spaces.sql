-- noinspection SqlResolveForFile
ALTER TABLE console_spaces RENAME TO connected_spaces;
ALTER TABLE connected_spaces RENAME COLUMN connectid TO connect_id;
ALTER TABLE connected_spaces
    MODIFY connect_id VARCHAR2(50);
ALTER TABLE connected_spaces RENAME COLUMN spaceid TO space_id;
ALTER TABLE connected_spaces
    MODIFY space_id VARCHAR2(50) NOT NULL;
ALTER TABLE connected_spaces
    MODIFY name VARCHAR2(50) NOT NULL;
ALTER TABLE connected_spaces
    DROP COLUMN type;
ALTER TABLE connected_spaces RENAME COLUMN istemplate TO is_template;
ALTER TABLE connected_spaces
    MODIFY is_template NUMBER(1) NOT NULL;
ALTER TABLE connected_spaces
    DROP COLUMN subjects;
ALTER TABLE connected_spaces
    DROP COLUMN groupids;
ALTER TABLE connected_spaces RENAME COLUMN userid TO user_id;
ALTER TABLE connected_spaces
    MODIFY user_id VARCHAR2(50) NOT NULL;
ALTER TABLE connected_spaces RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE connected_spaces
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE connected_spaces RENAME COLUMN lastvisittime TO last_visit_time;
ALTER TABLE connected_spaces
    MODIFY last_visit_time DATE NOT NULL;
ALTER TABLE connected_spaces
    DROP COLUMN createtime;
ALTER TABLE connected_spaces
    DROP COLUMN lastmodified;
ALTER TABLE connected_spaces
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE connected_spaces
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE connected_spaces
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE connected_spaces
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
CREATE INDEX i_connected_spaces_created_at ON connected_spaces (created_at);
CREATE INDEX i_connected_spaces_created_by ON connected_spaces (created_by);
CREATE INDEX i_connected_spaces_last_modified_at ON connected_spaces (last_modified_at);
CREATE INDEX i_connected_spaces_last_modified_by ON connected_spaces (last_modified_by);
CREATE INDEX i_connected_spaces_name ON connected_spaces (name);
CREATE INDEX i_connected_spaces_space_id ON connected_spaces (space_id);
CREATE INDEX i_connected_spaces_tenant_id ON connected_spaces (tenant_id);
CREATE INDEX i_connected_spaces_user_id ON connected_spaces (user_id);
CREATE OR REPLACE PROCEDURE WATCHMEN_MIGRATION_COPY_CONNECT_IDS IS
    CURSOR cur_list IS SELECT connect_id, subjectids, user_id
                       FROM connected_spaces
                       WHERE subjectids IS NOT NULL;
    subject_ids JSON_ARRAY_T;
    subject_id  VARCHAR2(50);
BEGIN
    FOR a_connected_space in cur_list
        LOOP
            subject_ids := JSON_ARRAY_T(a_connected_space.subjectids);
            FOR item_index IN 0 .. subject_ids.GET_SIZE() - 1
                LOOP
                    subject_id := subject_ids.GET_STRING(item_index);
                    subject_id := TRIM(BOTH '"' FROM subject_id);
                    EXECUTE IMMEDIATE 'UPDATE reports SET connect_id = ''' || a_connected_space.connect_id ||
                                      ''', user_id = ''' || a_connected_space.user_id || ''' WHERE subject_id = ''' ||
                                      subject_id || '''';
                    EXECUTE IMMEDIATE 'UPDATE subjects SET connect_id = ''' || a_connected_space.connect_id ||
                                      ''', user_id = ''' || a_connected_space.user_id || '''  WHERE subject_id = ''' ||
                                      subject_id || '''';
                    COMMIT;
                END LOOP;
        END LOOP;
END;
CALL WATCHMEN_MIGRATION_COPY_CONNECT_IDS();
DROP PROCEDURE WATCHMEN_MIGRATION_COPY_CONNECT_IDS;
-- noinspection SqlWithoutWhere
UPDATE connected_spaces
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1';
ALTER TABLE connected_spaces
    DROP COLUMN subjectids;
ALTER TABLE reports
    MODIFY subject_id VARCHAR2(50) NOT NULL;
ALTER TABLE reports
    MODIFY connect_id VARCHAR2(50) NOT NULL;
ALTER TABLE reports
    MODIFY user_id VARCHAR2(50) NOT NULL;
ALTER TABLE subjects
    MODIFY connect_id VARCHAR2(50) NOT NULL;
ALTER TABLE subjects
    MODIFY user_id VARCHAR2(50) NOT NULL;
