-- noinspection SqlResolveForFile
ALTER TABLE console_dashboards RENAME TO dashboards;
ALTER TABLE dashboards RENAME COLUMN dashboardid TO dashboard_id;
ALTER TABLE dashboards
    MODIFY dashboard_id VARCHAR2(50);
ALTER TABLE dashboards
    MODIFY name VARCHAR2(50) NOT NULL;
ALTER TABLE dashboards RENAME COLUMN lastvisittime TO last_visit_time;
ALTER TABLE dashboards
    MODIFY last_visit_time DATE NOT NULL;
ALTER TABLE dashboards RENAME COLUMN userid TO user_id;
ALTER TABLE dashboards
    MODIFY user_id VARCHAR2(50) NOT NULL;
ALTER TABLE dashboards RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE dashboards
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE dashboards
    ADD auto_refresh_interval NUMBER(20);
ALTER TABLE dashboards
    DROP COLUMN createtime;
ALTER TABLE dashboards
    DROP COLUMN lastmodified;
ALTER TABLE dashboards
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE dashboards
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE dashboards
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE dashboards
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
CREATE INDEX i_dashboards_created_at ON dashboards (created_at);
CREATE INDEX i_dashboards_created_by ON dashboards (created_by);
CREATE INDEX i_dashboards_last_modified_at ON dashboards (last_modified_at);
CREATE INDEX i_dashboards_last_modified_by ON dashboards (last_modified_by);
CREATE INDEX i_dashboards_name ON dashboards (name);
CREATE INDEX i_dashboards_tenant_id ON dashboards (tenant_id);
CREATE INDEX i_dashboards_user_id ON dashboards (user_id);
-- noinspection SqlWithoutWhere
UPDATE dashboards
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1';
