-- noinspection SqlResolveForFile
RENAME TABLE console_space_graph TO connected_space_graphics;
ALTER TABLE connected_space_graphics
    CHANGE connectid connect_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_space_graphics
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_space_graphics
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE connected_space_graphics
    DROP createtime;
ALTER TABLE connected_space_graphics
    DROP lastmodified;
ALTER TABLE connected_space_graphics
    ADD last_visit_time DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX user_id ON connected_space_graphics (user_id);
CREATE INDEX tenant_id ON connected_space_graphics (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE connected_space_graphics
SET last_visit_time = NOW();
