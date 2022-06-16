-- noinspection SqlResolveForFile
RENAME TABLE pipeline_index TO pipeline_index_1;
RENAME TABLE pipeline_index_1 TO pipeline_index;
ALTER TABLE pipeline_index
    CHANGE pipelineindexid pipeline_index_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_index
    CHANGE pipelineid pipeline_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_index
    CHANGE pipelinename pipeline_name VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    CHANGE stageid stage_id VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    CHANGE stagename stage_name VARCHAR(100) NULL;
ALTER TABLE pipeline_index
    CHANGE unitid unit_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_index
    CHANGE unitname unit_name VARCHAR(100) NULL;
ALTER TABLE pipeline_index
    CHANGE actionid action_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_index
    CHANGE mappingtotopicid mapping_to_topic_id VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    CHANGE mappingtofactorid mapping_to_factor_id VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    CHANGE sourcefromtopicid source_from_topic_id VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    CHANGE sourcefromfactorid source_from_factor_id VARCHAR(50) NULL;
ALTER TABLE pipeline_index
    ADD tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE pipeline_index
    DROP factorid;
ALTER TABLE pipeline_index
    DROP reftype;
ALTER TABLE pipeline_index
    DROP createtime;
ALTER TABLE pipeline_index
    DROP lastmodified;
ALTER TABLE pipeline_index
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE pipeline_index
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX created_at ON pipeline_index (created_at);
CREATE INDEX last_modified_at ON pipeline_index (last_modified_at);
CREATE INDEX mapping_to_factor_id ON pipeline_index (mapping_to_factor_id);
CREATE INDEX mapping_to_topic_id ON pipeline_index (mapping_to_topic_id);
CREATE INDEX pipeline_id ON pipeline_index (pipeline_id);
CREATE INDEX pipeline_name ON pipeline_index (pipeline_name);
CREATE INDEX source_from_factor_id ON pipeline_index (source_from_factor_id);
CREATE INDEX source_from_topic_id ON pipeline_index (source_from_topic_id);
CREATE INDEX tenant_id ON pipeline_index (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE pipeline_index
SET created_at       = NOW(),
    last_modified_at = NOW();
