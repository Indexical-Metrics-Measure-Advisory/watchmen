-- noinspection SqlResolveForFile
ALTER TABLE pipeline_index RENAME TO pipeline_index_1;
ALTER TABLE pipeline_index_1 RENAME TO pipeline_index;
TRUNCATE TABLE pipeline_index;
ALTER TABLE pipeline_index RENAME COLUMN pipelineindexid TO pipeline_index_id;
ALTER TABLE pipeline_index
    MODIFY pipeline_index_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN pipelineid TO pipeline_id;
ALTER TABLE pipeline_index
    MODIFY pipeline_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN pipelinename TO pipeline_name;
ALTER TABLE pipeline_index
    MODIFY pipeline_name VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN stageid TO stage_id;
ALTER TABLE pipeline_index
    MODIFY stage_id VARCHAR2(50) NULL;
ALTER TABLE pipeline_index RENAME COLUMN stagename TO stage_name;
ALTER TABLE pipeline_index
    MODIFY stage_name VARCHAR2(100);
ALTER TABLE pipeline_index RENAME COLUMN unitid TO unit_id;
ALTER TABLE pipeline_index
    MODIFY unit_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN unitname TO unit_name;
ALTER TABLE pipeline_index
    MODIFY unit_name VARCHAR2(100);
ALTER TABLE pipeline_index RENAME COLUMN actionid TO action_id;
ALTER TABLE pipeline_index
    MODIFY action_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN mappingtotopicid TO mapping_to_topic_id;
ALTER TABLE pipeline_index
    MODIFY mapping_to_topic_id VARCHAR2(50) NOT NULL;
ALTER TABLE pipeline_index RENAME COLUMN mappingtofactorid TO mapping_to_factor_id;
ALTER TABLE pipeline_index
    MODIFY mapping_to_factor_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN sourcefromtopicid TO source_from_topic_id;
ALTER TABLE pipeline_index
    MODIFY source_from_topic_id VARCHAR2(50);
ALTER TABLE pipeline_index RENAME COLUMN sourcefromfactorid TO source_from_factor_id;
ALTER TABLE pipeline_index
    MODIFY source_from_factor_id VARCHAR2(50);
-- noinspection SqlAddNotNullColumn
ALTER TABLE pipeline_index
    ADD tenant_id VARCHAR2(50) NOT NULL;
ALTER TABLE pipeline_index
    DROP COLUMN factorid;
ALTER TABLE pipeline_index
    DROP COLUMN reftype;
ALTER TABLE pipeline_index
    DROP COLUMN createtime;
ALTER TABLE pipeline_index
    DROP COLUMN lastmodified;
ALTER TABLE pipeline_index
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE pipeline_index
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_pipeline_index_created_at ON pipeline_index (created_at);
CREATE INDEX i_pipeline_index_last_modified_at ON pipeline_index (last_modified_at);
CREATE INDEX i_pipeline_index_mapping_to_factor_id ON pipeline_index (mapping_to_factor_id);
CREATE INDEX i_pipeline_index_mapping_to_topic_id ON pipeline_index (mapping_to_topic_id);
CREATE INDEX i_pipeline_index_pipeline_id ON pipeline_index (pipeline_id);
CREATE INDEX i_pipeline_index_pipeline_name ON pipeline_index (pipeline_name);
CREATE INDEX i_pipeline_index_source_from_factor_id ON pipeline_index (source_from_factor_id);
CREATE INDEX i_pipeline_index_source_from_topic_id ON pipeline_index (source_from_topic_id);
CREATE INDEX i_pipeline_index_tenant_id ON pipeline_index (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE pipeline_index
SET created_at       = SYSDATE,
    last_modified_at = SYSDATE;
