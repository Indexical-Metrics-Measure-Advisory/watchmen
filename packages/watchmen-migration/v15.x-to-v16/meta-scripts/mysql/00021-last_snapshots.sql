-- noinspection SqlResolveForFile
RENAME TABLE console_space_last_snapshot TO last_snapshots;
ALTER TABLE last_snapshots
    MODIFY language VARCHAR(20) NULL;
ALTER TABLE last_snapshots
    CHANGE lastdashboardid last_dashboard_id VARCHAR(50) NULL;
ALTER TABLE last_snapshots
    CHANGE admindashboardid admin_dashboard_id VARCHAR(50) NULL;
ALTER TABLE last_snapshots
    CHANGE favoritepin favorite_pin TINYINT(1) NULL;
ALTER TABLE last_snapshots
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE last_snapshots
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE last_snapshots
    DROP createtime;
ALTER TABLE last_snapshots
    DROP lastmodified;
ALTER TABLE last_snapshots
    ADD last_visit_time DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX tenant_id ON last_snapshots (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE last_snapshots
SET last_visit_time = NOW();
