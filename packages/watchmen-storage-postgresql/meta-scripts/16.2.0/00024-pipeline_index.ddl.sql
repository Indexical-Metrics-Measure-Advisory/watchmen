CREATE TABLE pipeline_index
(
    pipeline_index_id     VARCHAR(50) NOT NULL,
    pipeline_id           VARCHAR(50) NOT NULL,
    pipeline_name         VARCHAR(128),
    stage_id              VARCHAR(50) NOT NULL,
    stage_name            VARCHAR(128),
    unit_id               VARCHAR(50) NOT NULL,
    unit_name             VARCHAR(128),
    action_id             VARCHAR(50) NOT NULL,
    mapping_to_topic_id   VARCHAR(50) NOT NULL,
    mapping_to_factor_id  VARCHAR(50) NOT NULL,
    source_from_topic_id  VARCHAR(50) NOT NULL,
    source_from_factor_id VARCHAR(50) NOT NULL,
    tenant_id             VARCHAR(50) NOT NULL,
    created_at            TIMESTAMP   NOT NULL,
    last_modified_at      TIMESTAMP   NOT NULL,
    CONSTRAINT pk_pipeline_index PRIMARY KEY (pipeline_index_id)
);
CREATE INDEX i_pipeline_index_1 ON pipeline_index (pipeline_id);
CREATE INDEX i_pipeline_index_2 ON pipeline_index (pipeline_name);
CREATE INDEX i_pipeline_index_3 ON pipeline_index (mapping_to_topic_id);
CREATE INDEX i_pipeline_index_4 ON pipeline_index (mapping_to_factor_id);
CREATE INDEX i_pipeline_index_5 ON pipeline_index (source_from_topic_id);
CREATE INDEX i_pipeline_index_6 ON pipeline_index (source_from_factor_id);
CREATE INDEX i_pipeline_index_7 ON pipeline_index (tenant_id);
CREATE INDEX i_pipeline_index_8 ON pipeline_index (created_at);
CREATE INDEX i_pipeline_index_9 ON pipeline_index (last_modified_at);
