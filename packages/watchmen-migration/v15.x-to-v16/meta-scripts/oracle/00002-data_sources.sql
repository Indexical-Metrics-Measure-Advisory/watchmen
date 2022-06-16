ALTER TABLE data_sources RENAME TO data_sources_1;
ALTER TABLE data_sources_1 RENAME TO data_sources;
ALTER TABLE data_sources RENAME COLUMN datasourceid TO data_source_id;
ALTER TABLE data_sources
    MODIFY data_source_id VARCHAR2(50);
ALTER TABLE data_sources RENAME COLUMN dataSourceCode TO data_source_code;
ALTER TABLE data_sources
    MODIFY data_source_code VARCHAR2(50);
ALTER TABLE data_sources RENAME COLUMN dataSourceType TO data_source_type;
ALTER TABLE data_sources
    MODIFY data_source_type VARCHAR2(50);
ALTER TABLE data_sources
    MODIFY port VARCHAR2(5);
ALTER TABLE data_sources
    MODIFY url VARCHAR2(255);
ALTER TABLE data_sources RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE data_sources
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE data_sources
    DROP COLUMN createtime;
ALTER TABLE data_sources
    DROP COLUMN lastmodified;
ALTER TABLE data_sources
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE data_sources
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE data_sources
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE data_sources
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE data_sources
    ADD version NUMBER(20) NULL;
CREATE INDEX i_data_sources_created_at ON data_sources (created_at);
CREATE INDEX i_data_sources_created_by ON data_sources (created_by);
CREATE INDEX i_data_sources_last_modified_at ON data_sources (last_modified_at);
CREATE INDEX i_data_sources_last_modified_by ON data_sources (last_modified_by);
CREATE INDEX i_data_sources_tenant_id ON data_sources (tenant_id);
CREATE INDEX i_data_sources_data_source_code ON data_sources (data_source_code);
CREATE INDEX i_data_sources_data_source_type ON data_sources (data_source_type);
-- noinspection SqlWithoutWhere
UPDATE data_sources
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
