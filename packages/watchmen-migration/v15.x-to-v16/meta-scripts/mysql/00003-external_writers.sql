-- noinspection SqlResolveForFile
RENAME TABLE external_writer TO external_writers;
ALTER TABLE external_writers
    CHANGE writerid writer_id VARCHAR(50) NOT NULL;
ALTER TABLE external_writers
    CHANGE writercode writer_code VARCHAR(50) NOT NULL;
ALTER TABLE external_writers
    MODIFY pat VARCHAR(255) NULL;
ALTER TABLE external_writers
    MODIFY url VARCHAR(255) NULL;
ALTER TABLE external_writers
    CHANGE tenantId tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE external_writers
    DROP createtime;
ALTER TABLE external_writers
    DROP lastmodified;
ALTER TABLE external_writers
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE external_writers
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE external_writers
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE external_writers
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE external_writers
    ADD version BIGINT NULL;
CREATE INDEX created_at ON external_writers (created_at);
CREATE INDEX created_by ON external_writers (created_by);
CREATE INDEX last_modified_at ON external_writers (last_modified_at);
CREATE INDEX last_modified_by ON external_writers (last_modified_by);
CREATE INDEX writer_code ON external_writers (writer_code);
CREATE INDEX type ON external_writers (type);
CREATE INDEX tenant_id ON external_writers (tenant_id);
CREATE UNIQUE INDEX writer_code_tenant_id ON external_writers (writer_code, tenant_id);
-- noinspection SqlWithoutWhere
UPDATE external_writers
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
