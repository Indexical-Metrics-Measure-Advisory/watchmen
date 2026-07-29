
CREATE TABLE collector_semantic_pipelines
(
    pipeline_id          VARCHAR(50)  NOT NULL,
    topic_id             VARCHAR(50)  NOT NULL,
    name                 VARCHAR(128) NOT NULL,
    actions              JSON,
    sources              JSON,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    version              DECIMAL(20),
    CONSTRAINT pk_collector_semantic_pipelines PRIMARY KEY (pipeline_id)
);
CREATE INDEX i_collector_semantic_pipelines_1 ON collector_semantic_pipelines (name);
CREATE INDEX i_collector_semantic_pipelines_5 ON collector_semantic_pipelines (tenant_id);
CREATE INDEX i_collector_semantic_pipelines_6 ON collector_semantic_pipelines (created_at);
CREATE INDEX i_collector_semantic_pipelines_7 ON collector_semantic_pipelines (created_by);
CREATE INDEX i_collector_semantic_pipelines_8 ON collector_semantic_pipelines (last_modified_at);
CREATE INDEX i_collector_semantic_pipelines_9 ON collector_semantic_pipelines (last_modified_by);
