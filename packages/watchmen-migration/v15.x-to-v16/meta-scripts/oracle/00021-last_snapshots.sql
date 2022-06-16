-- noinspection SqlResolveForFile
ALTER TABLE console_space_last_snapshot RENAME TO last_snapshots;
ALTER TABLE last_snapshots
    MODIFY language VARCHAR2(20);
ALTER TABLE last_snapshots RENAME COLUMN lastdashboardid TO last_dashboard_id;
ALTER TABLE last_snapshots
    MODIFY last_dashboard_id VARCHAR2(50);
ALTER TABLE last_snapshots RENAME COLUMN admindashboardid TO admin_dashboard_id;
ALTER TABLE last_snapshots
    MODIFY admin_dashboard_id VARCHAR2(50);
ALTER TABLE last_snapshots RENAME COLUMN favoritepin TO favorite_pin;
ALTER TABLE last_snapshots
    MODIFY favorite_pin NUMBER(1);
ALTER TABLE last_snapshots RENAME COLUMN userid TO user_id;
ALTER TABLE last_snapshots
    MODIFY user_id VARCHAR2(50);
ALTER TABLE last_snapshots RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE last_snapshots
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE last_snapshots
    DROP COLUMN createtime;
ALTER TABLE last_snapshots
    DROP COLUMN lastmodified;
ALTER TABLE last_snapshots
    ADD last_visit_time DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_last_snapshots_tenant_id ON last_snapshots (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE last_snapshots
SET last_visit_time = SYSDATE;
