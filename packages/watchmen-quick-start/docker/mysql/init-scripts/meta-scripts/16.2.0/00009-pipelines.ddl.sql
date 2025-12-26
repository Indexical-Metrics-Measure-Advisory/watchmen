ALTER TABLE pipelines
    MODIFY name VARCHAR(128);
ALTER TABLE pipeline_index
    MODIFY pipeline_name VARCHAR(128);
ALTER TABLE pipeline_index
    MODIFY stage_name VARCHAR(128);
ALTER TABLE pipeline_index
    MODIFY unit_name VARCHAR(128);
