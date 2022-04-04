CREATE TABLE pipelines
(
    pipeline_id          NVARCHAR(50) NOT NULL,
    topic_id             NVARCHAR(50) NOT NULL,
    name                 NVARCHAR(50) NOT NULL,
    type                 NVARCHAR(20) NOT NULL,
    prerequisite_enabled TINYINT,
    prerequisite_on      NVARCHAR(MAX),
    stages               NVARCHAR(MAX),
    enabled              TINYINT,
    validated            TINYINT,
    tenant_id            NVARCHAR(50) NOT NULL,
    created_at           DATETIME     NOT NULL,
    created_by           NVARCHAR(50) NOT NULL,
    last_modified_at     DATETIME     NOT NULL,
    last_modified_by     NVARCHAR(50) NOT NULL,
    version              DECIMAL(20),
    CONSTRAINT pk_pipelines PRIMARY KEY (pipeline_id)
);
CREATE INDEX i_pipelines_1 ON pipelines (name);
CREATE INDEX i_pipelines_2 ON pipelines (type);
CREATE INDEX i_pipelines_3 ON pipelines (enabled);
CREATE INDEX i_pipelines_4 ON pipelines (validated);
CREATE INDEX i_pipelines_5 ON pipelines (tenant_id);
CREATE INDEX i_pipelines_6 ON pipelines (created_at);
CREATE INDEX i_pipelines_7 ON pipelines (created_by);
CREATE INDEX i_pipelines_8 ON pipelines (last_modified_at);
CREATE INDEX i_pipelines_9 ON pipelines (last_modified_by);
