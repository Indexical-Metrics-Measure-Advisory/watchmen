CREATE TABLE pipeline_graphics
(
    pipeline_graphic_id NVARCHAR(50) NOT NULL,
    name                NVARCHAR(50) NOT NULL,
    topics              NVARCHAR(MAX),
    user_id             NVARCHAR(50) NOT NULL,
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME     NOT NULL,
    last_modified_at    DATETIME     NOT NULL,
    CONSTRAINT pk_pipeline_graphics PRIMARY KEY (pipeline_graphic_id)
);
CREATE INDEX i_pipeline_graphics_1 ON pipeline_graphics (name);
CREATE INDEX i_pipeline_graphics_2 ON pipeline_graphics (user_id);
CREATE INDEX i_pipeline_graphics_3 ON pipeline_graphics (tenant_id);
