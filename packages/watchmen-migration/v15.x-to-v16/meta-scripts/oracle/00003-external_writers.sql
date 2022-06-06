-- noinspection SqlResolveForFile
ALTER TABLE external_writer RENAME TO external_writers;
ALTER TABLE external_writers RENAME COLUMN writerid TO writer_id;
ALTER TABLE external_writers
    MODIFY writer_id VARCHAR2(50);
ALTER TABLE external_writers RENAME COLUMN writercode TO writer_code;
ALTER TABLE external_writers
    MODIFY writer_code VARCHAR2(50);
ALTER TABLE external_writers
    MODIFY pat VARCHAR2(255);
ALTER TABLE external_writers
    MODIFY url VARCHAR2(255);
ALTER TABLE external_writers RENAME COLUMN tenantId TO tenant_id;
ALTER TABLE external_writers
    MODIFY tenant_id VARCHAR2(50) NOT NULL;
ALTER TABLE external_writers
    DROP COLUMN createtime;
ALTER TABLE external_writers
    DROP COLUMN lastmodified;
ALTER TABLE external_writers
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE external_writers
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE external_writers
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE external_writers
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE external_writers
    ADD version NUMBER(20) NULL;
CREATE INDEX i_external_writers_created_at ON external_writers (created_at);
CREATE INDEX i_external_writers_created_by ON external_writers (created_by);
CREATE INDEX i_external_writers_last_modified_at ON external_writers (last_modified_at);
CREATE INDEX i_external_writers_last_modified_by ON external_writers (last_modified_by);
CREATE INDEX i_external_writers_writer_code ON external_writers (writer_code);
CREATE INDEX i_external_writers_type ON external_writers (type);
CREATE INDEX i_external_writers_tenant_id ON external_writers (tenant_id);
CREATE UNIQUE INDEX u_external_writers_writer_code_tenant_id ON external_writers (writer_code, tenant_id);
-- noinspection SqlWithoutWhere
UPDATE external_writers
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
