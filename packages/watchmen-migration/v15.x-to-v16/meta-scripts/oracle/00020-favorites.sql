-- noinspection SqlResolveForFile
ALTER TABLE console_space_favorites RENAME TO favorites;
ALTER TABLE favorites
    ADD connected_space_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE favorites
SET connected_space_ids = connectedspaceids;
ALTER TABLE favorites
    DROP COLUMN connectedspaceids;
ALTER TABLE favorites
    ADD dashboard_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE favorites
SET dashboard_ids = dashboardids;
ALTER TABLE favorites
    DROP COLUMN dashboardids;
ALTER TABLE favorites RENAME COLUMN userid TO user_id;
ALTER TABLE favorites
    MODIFY user_id VARCHAR2(50);
ALTER TABLE favorites RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE favorites
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE favorites
    DROP COLUMN createtime;
ALTER TABLE favorites
    DROP COLUMN lastmodified;
ALTER TABLE favorites
    ADD last_visit_time DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_favorites_tenant_id ON favorites (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE favorites
SET last_visit_time = SYSDATE;
