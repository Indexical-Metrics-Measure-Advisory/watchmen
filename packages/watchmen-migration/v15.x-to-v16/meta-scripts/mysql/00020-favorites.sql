-- noinspection SqlResolveForFile
RENAME TABLE console_space_favorites TO favorites;
ALTER TABLE favorites
    CHANGE connectedspaceids connected_space_ids JSON;
ALTER TABLE favorites
    CHANGE dashboardids dashboard_ids JSON;
ALTER TABLE favorites
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE favorites
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE favorites
    DROP createtime;
ALTER TABLE favorites
    DROP lastmodified;
ALTER TABLE favorites
    ADD last_visit_time DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX tenant_id ON favorites (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE favorites
SET last_visit_time = NOW();
