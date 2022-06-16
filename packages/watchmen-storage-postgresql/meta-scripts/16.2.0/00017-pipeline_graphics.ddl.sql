CREATE TABLE pipeline_graphics
(
    pipeline_graphic_id VARCHAR(50) NOT NULL,
    name                VARCHAR(50) NOT NULL,
    topics              JSON,
    user_id             VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP   NOT NULL,
    last_modified_at    TIMESTAMP   NOT NULL,
    CONSTRAINT pk_pipeline_graphics PRIMARY KEY (pipeline_graphic_id)
);
CREATE INDEX i_pipeline_graphics_1 ON pipeline_graphics (name);
CREATE INDEX i_pipeline_graphics_2 ON pipeline_graphics (user_id);
CREATE INDEX i_pipeline_graphics_3 ON pipeline_graphics (tenant_id);
