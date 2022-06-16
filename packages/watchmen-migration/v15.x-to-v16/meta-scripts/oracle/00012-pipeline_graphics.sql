-- noinspection SqlResolveForFile
ALTER TABLE pipeline_graph RENAME TO pipeline_graphics;
ALTER TABLE pipeline_graphics RENAME COLUMN pipelinegraphid TO pipeline_graphic_id;
ALTER TABLE pipeline_graphics
    MODIFY pipeline_graphic_id VARCHAR2(50);
ALTER TABLE pipeline_graphics RENAME COLUMN userid TO user_id;
ALTER TABLE pipeline_graphics
    MODIFY user_id VARCHAR2(50);
ALTER TABLE pipeline_graphics RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE pipeline_graphics
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE pipeline_graphics
    DROP COLUMN createtime;
ALTER TABLE pipeline_graphics
    DROP COLUMN lastmodified;
ALTER TABLE pipeline_graphics
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE pipeline_graphics
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_pipeline_graphics_tenant_id ON pipeline_graphics (tenant_id);
CREATE INDEX i_pipeline_graphics_user_id ON pipeline_graphics (user_id);
CREATE INDEX i_pipeline_graphics_name ON pipeline_graphics (name);
-- noinspection SqlWithoutWhere
UPDATE pipeline_graphics
SET created_at       = SYSDATE,
    last_modified_at = SYSDATE;
