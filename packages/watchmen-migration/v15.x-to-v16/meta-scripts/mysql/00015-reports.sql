-- noinspection SqlResolveForFile
RENAME TABLE reports TO reports_1;
RENAME TABLE reports_1 TO reports;
ALTER TABLE reports
    CHANGE reportid report_id VARCHAR(50) NOT NULL;
ALTER TABLE reports
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE reports
    ADD connect_id VARCHAR(50) NOT NULL;
ALTER TABLE reports
    ADD subject_id VARCHAR(50) NOT NULL;
ALTER TABLE reports
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE reports
    MODIFY simulating TINYINT(1) NOT NULL;
ALTER TABLE reports
    CHANGE simulateData simulate_data JSON NULL;
ALTER TABLE reports
    CHANGE simulateThumbnail simulate_thumbnail MEDIUMTEXT NULL;
ALTER TABLE reports
    ADD user_id VARCHAR(50) NOT NULL;
ALTER TABLE reports
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE reports
    CHANGE lastvisittime last_visit_time DATETIME DEFAULT NOW() NULL;
ALTER TABLE reports
    DROP createtime;
ALTER TABLE reports
    DROP lastmodified;
ALTER TABLE reports
    DROP createdat;
ALTER TABLE reports
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE reports
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE reports
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE reports
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
CREATE INDEX created_at ON reports (created_at);
CREATE INDEX created_by ON reports (created_by);
CREATE INDEX last_modified_at ON reports (last_modified_at);
CREATE INDEX last_modified_by ON reports (last_modified_by);
CREATE INDEX name ON reports (name);
CREATE INDEX user_id ON reports (user_id);
CREATE INDEX tenant_id ON reports (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE reports
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1';
