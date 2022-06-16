-- noinspection SqlResolveForFile
RENAME TABLE pipelines TO pipelines_1;
RENAME TABLE pipelines_1 TO pipelines;
ALTER TABLE pipelines
    CHANGE pipelineid pipeline_id VARCHAR(50) NOT NULL;
ALTER TABLE pipelines
    CHANGE topicid topic_id VARCHAR(50) NOT NULL;
ALTER TABLE pipelines
    MODIFY type VARCHAR(20) NOT NULL;
ALTER TABLE pipelines
    CHANGE conditional prerequisite_enabled TINYINT(1);
ALTER TABLE pipelines
    CHANGE `on` prerequisite_on JSON;
ALTER TABLE pipelines
    MODIFY enabled TINYINT(1) NULL;
ALTER TABLE pipelines
    ADD validated TINYINT(1) NULL;
ALTER TABLE pipelines
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE pipelines
    DROP createtime;
ALTER TABLE pipelines
    DROP lastmodified;
ALTER TABLE pipelines
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE pipelines
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE pipelines
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE pipelines
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE pipelines
    ADD version BIGINT NULL;
CREATE INDEX created_at ON pipelines (created_at);
CREATE INDEX created_by ON pipelines (created_by);
CREATE INDEX last_modified_at ON pipelines (last_modified_at);
CREATE INDEX last_modified_by ON pipelines (last_modified_by);
CREATE INDEX enabled ON pipelines (enabled);
CREATE INDEX name ON pipelines (name);
CREATE INDEX type ON pipelines (type);
CREATE INDEX validated ON pipelines (validated);
CREATE INDEX tenant_id ON pipelines (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE pipelines
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
