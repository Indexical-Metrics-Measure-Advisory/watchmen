-- noinspection SqlResolveForFile
RENAME TABLE console_dashboards TO dashboards;
ALTER TABLE dashboards
    CHANGE dashboardid dashboard_id VARCHAR(50) NOT NULL;
ALTER TABLE dashboards
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE dashboards
    CHANGE lastvisittime last_visit_time DATETIME DEFAULT NOW() NULL;
ALTER TABLE dashboards
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE dashboards
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE dashboards
    ADD auto_refresh_interval BIGINT;
ALTER TABLE dashboards
    DROP createtime;
ALTER TABLE dashboards
    DROP lastmodified;
ALTER TABLE dashboards
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE dashboards
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE dashboards
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE dashboards
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
CREATE INDEX created_at ON dashboards (created_at);
CREATE INDEX created_by ON dashboards (created_by);
CREATE INDEX last_modified_at ON dashboards (last_modified_at);
CREATE INDEX last_modified_by ON dashboards (last_modified_by);
CREATE INDEX name ON dashboards (name);
CREATE INDEX tenant_id ON dashboards (tenant_id);
CREATE INDEX user_id ON dashboards (user_id);
-- noinspection SqlWithoutWhere
UPDATE dashboards
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1';
