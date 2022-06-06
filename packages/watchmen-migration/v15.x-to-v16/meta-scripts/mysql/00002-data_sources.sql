-- noinspection SqlResolveForFile
RENAME TABLE data_sources TO data_sources_1;
RENAME TABLE data_sources_1 TO data_sources;
ALTER TABLE data_sources
    CHANGE datasourceid data_source_id VARCHAR(50) NOT NULL;
ALTER TABLE data_sources
    CHANGE dataSourceCode data_source_code VARCHAR(50) NOT NULL;
ALTER TABLE data_sources
    CHANGE dataSourceType data_source_type VARCHAR(50) NOT NULL;
ALTER TABLE data_sources
    MODIFY port VARCHAR(5) NULL;
ALTER TABLE data_sources
    MODIFY url VARCHAR(255) NULL;
ALTER TABLE data_sources
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE data_sources
    DROP createtime;
ALTER TABLE data_sources
    DROP lastmodified;
ALTER TABLE data_sources
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE data_sources
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE data_sources
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE data_sources
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE data_sources
    ADD version BIGINT NULL;
CREATE INDEX created_at ON data_sources (created_at);
CREATE INDEX created_by ON data_sources (created_by);
CREATE INDEX last_modified_at ON data_sources (last_modified_at);
CREATE INDEX last_modified_by ON data_sources (last_modified_by);
CREATE INDEX tenant_id ON data_sources (tenant_id);
CREATE INDEX data_source_code ON data_sources (data_source_code);
CREATE INDEX data_source_type ON data_sources (data_source_type);
-- noinspection SqlWithoutWhere
UPDATE data_sources
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
