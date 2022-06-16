-- noinspection SqlResolveForFile
ALTER TABLE console_space_graph RENAME TO connected_space_graphics;
ALTER TABLE connected_space_graphics RENAME COLUMN connectid TO connect_id;
ALTER TABLE connected_space_graphics
    MODIFY connect_id VARCHAR2(50);
ALTER TABLE connected_space_graphics RENAME COLUMN userid TO user_id;
ALTER TABLE connected_space_graphics
    MODIFY user_id VARCHAR2(50) NOT NULL;
ALTER TABLE connected_space_graphics RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE connected_space_graphics
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE connected_space_graphics
    DROP COLUMN createtime;
ALTER TABLE connected_space_graphics
    DROP COLUMN lastmodified;
ALTER TABLE connected_space_graphics
    ADD last_visit_time DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_connected_space_graphics_user_id ON connected_space_graphics (user_id);
CREATE INDEX i_connected_space_graphics_tenant_id ON connected_space_graphics (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE connected_space_graphics
SET last_visit_time = SYSDATE;
