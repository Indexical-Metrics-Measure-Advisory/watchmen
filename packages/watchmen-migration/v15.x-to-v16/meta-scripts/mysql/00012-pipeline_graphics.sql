-- noinspection SqlResolveForFile
RENAME TABLE pipeline_graph TO pipeline_graphics;
ALTER TABLE pipeline_graphics
    CHANGE pipelinegraphid pipeline_graphic_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_graphics
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_graphics
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_graphics
    DROP createtime;
ALTER TABLE pipeline_graphics
    DROP lastmodified;
ALTER TABLE pipeline_graphics
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE pipeline_graphics
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX tenant_id ON pipeline_graphics (tenant_id);
CREATE INDEX user_id ON pipeline_graphics (user_id);
CREATE INDEX name ON pipeline_graphics (name);
-- noinspection SqlWithoutWhere
UPDATE pipeline_graphics
SET created_at       = NOW(),
    last_modified_at = NOW();
