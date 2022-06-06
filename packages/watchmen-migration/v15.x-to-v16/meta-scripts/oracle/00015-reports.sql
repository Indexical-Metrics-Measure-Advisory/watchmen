-- noinspection SqlResolveForFile
ALTER TABLE reports RENAME TO reports_1;
ALTER TABLE reports_1 RENAME TO reports;
ALTER TABLE reports RENAME COLUMN reportid TO report_id;
ALTER TABLE reports
    MODIFY report_id VARCHAR2(50);
ALTER TABLE reports
    MODIFY name VARCHAR2(50) NOT NULL;
ALTER TABLE reports
    ADD connect_id VARCHAR2(50) NULL;
ALTER TABLE reports
    ADD subject_id VARCHAR2(50) NULL;
ALTER TABLE reports
    MODIFY description VARCHAR2(1024);
ALTER TABLE reports RENAME COLUMN simulating to simulating_1;
ALTER TABLE reports
    ADD simulating NUMBER(1) DEFAULT 0 NOT NULL;
UPDATE reports
SET simulating = 1
WHERE LOWER(simulating_1) != 'false';
ALTER TABLE reports
    DROP COLUMN simulating_1;
ALTER TABLE reports RENAME COLUMN simulateData TO simulate_data;
ALTER TABLE reports RENAME COLUMN simulateThumbnail TO simulate_thumbnail;
ALTER TABLE reports
    ADD user_id VARCHAR2(50) NULL;
ALTER TABLE reports RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE reports
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE reports RENAME COLUMN lastvisittime TO last_visit_time;
ALTER TABLE reports
    MODIFY last_visit_time DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE reports
    DROP COLUMN createtime;
ALTER TABLE reports
    DROP COLUMN lastmodified;
ALTER TABLE reports
    DROP COLUMN createdat;
ALTER TABLE reports
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE reports
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE reports
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE reports
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
CREATE INDEX i_reports_created_at ON reports (created_at);
CREATE INDEX i_reports_created_by ON reports (created_by);
CREATE INDEX i_reports_last_modified_at ON reports (last_modified_at);
CREATE INDEX i_reports_last_modified_by ON reports (last_modified_by);
CREATE INDEX i_reports_name ON reports (name);
CREATE INDEX i_reports_user_id ON reports (user_id);
CREATE INDEX i_reports_tenant_id ON reports (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE reports
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1';
