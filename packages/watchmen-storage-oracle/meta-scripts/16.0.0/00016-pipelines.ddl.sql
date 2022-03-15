CREATE TABLE pipelines
(
    pipeline_id      VARCHAR2(50) NOT NULL,
    topic_id         VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50) NOT NULL,
    type             VARCHAR2(20) NOT NULL,
    stages           CLOB,
    enabled          NUMBER(1),
    validated        NUMBER(1),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
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
