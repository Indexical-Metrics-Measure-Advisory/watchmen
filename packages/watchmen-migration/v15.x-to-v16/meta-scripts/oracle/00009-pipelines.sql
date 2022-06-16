-- noinspection SqlResolveForFile
ALTER TABLE pipelines RENAME TO pipelines_1;
ALTER TABLE pipelines_1 RENAME TO pipelines;
ALTER TABLE pipelines RENAME COLUMN pipelineid TO pipeline_id;
ALTER TABLE pipelines
    MODIFY pipeline_id VARCHAR2(50);
ALTER TABLE pipelines RENAME COLUMN topicid TO topic_id;
ALTER TABLE pipelines
    MODIFY topic_id VARCHAR2(50);
ALTER TABLE pipelines
    MODIFY type VARCHAR2(20) NOT NULL;
ALTER TABLE pipelines RENAME COLUMN conditional TO prerequisite_enabled;
ALTER TABLE pipelines
    MODIFY prerequisite_enabled NUMBER(1);
ALTER TABLE pipelines RENAME COLUMN "on" TO prerequisite_on;
ALTER TABLE pipelines
    MODIFY enabled NUMBER(1);
ALTER TABLE pipelines
    ADD validated NUMBER(1) NULL;
ALTER TABLE pipelines RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE pipelines
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE pipelines
    DROP COLUMN createtime;
ALTER TABLE pipelines
    DROP COLUMN lastmodified;
ALTER TABLE pipelines
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE pipelines
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE pipelines
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE pipelines
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE pipelines
    ADD version NUMBER(20) NULL;
CREATE INDEX i_pipelines_created_at ON pipelines (created_at);
CREATE INDEX i_pipelines_created_by ON pipelines (created_by);
CREATE INDEX i_pipelines_last_modified_at ON pipelines (last_modified_at);
CREATE INDEX i_pipelines_last_modified_by ON pipelines (last_modified_by);
CREATE INDEX i_pipelines_enabled ON pipelines (enabled);
CREATE INDEX i_pipelines_name ON pipelines (name);
CREATE INDEX i_pipelines_type ON pipelines (type);
CREATE INDEX i_pipelines_validated ON pipelines (validated);
CREATE INDEX i_pipelines_tenant_id ON pipelines (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE pipelines
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
