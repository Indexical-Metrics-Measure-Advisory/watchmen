CREATE TABLE pipeline_graphics
(
    pipeline_graphic_id VARCHAR2(50) NOT NULL,
    name                VARCHAR2(50) NOT NULL,
    topics              CLOB,
    user_id             VARCHAR2(50) NOT NULL,
    tenant_id           VARCHAR2(50) NOT NULL,
    created_at          DATE         NOT NULL,
    last_modified_at    DATE         NOT NULL,
    CONSTRAINT pk_pipeline_graphics PRIMARY KEY (pipeline_graphic_id)
);
CREATE INDEX i_pipeline_graphics_1 ON pipeline_graphics (name);
CREATE INDEX i_pipeline_graphics_2 ON pipeline_graphics (user_id);
CREATE INDEX i_pipeline_graphics_3 ON pipeline_graphics (tenant_id);
