CREATE TABLE pipelines
(
    pipeline_id          VARCHAR(50)  NOT NULL,
    topic_id             VARCHAR(50)  NOT NULL,
    name                 VARCHAR(128) NOT NULL,
    type                 VARCHAR(20)  NOT NULL,
    prerequisite_enabled SMALLINT,
    prerequisite_on      JSON,
    stages               JSON,
    enabled              SMALLINT,
    validated            SMALLINT,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
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
