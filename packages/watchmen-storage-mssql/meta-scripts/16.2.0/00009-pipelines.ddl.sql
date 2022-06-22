ALTER TABLE pipelines
    ALTER COLUMN name NVARCHAR(128);
ALTER TABLE pipeline_index
    ALTER COLUMN pipeline_name NVARCHAR(128);
ALTER TABLE pipeline_index
    ALTER COLUMN stage_name NVARCHAR(128);
ALTER TABLE pipeline_index
    ALTER COLUMN unit_name NVARCHAR(128);
