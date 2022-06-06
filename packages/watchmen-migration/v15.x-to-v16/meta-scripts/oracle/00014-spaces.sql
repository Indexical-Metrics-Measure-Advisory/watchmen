-- noinspection SqlResolveForFile
ALTER TABLE spaces RENAME TO spaces_1;
ALTER TABLE spaces_1 RENAME TO spaces;
ALTER TABLE spaces RENAME COLUMN spaceid TO space_id;
ALTER TABLE spaces
    MODIFY space_id VARCHAR2(50);
ALTER TABLE spaces
    MODIFY name VARCHAR2(50) NOT NULL;
ALTER TABLE spaces
    MODIFY description VARCHAR2(1024);
ALTER TABLE spaces
    ADD topic_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE spaces
SET topic_ids = topicids;
ALTER TABLE spaces
    DROP COLUMN topicids;
ALTER TABLE spaces
    ADD group_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE spaces
SET group_ids = groupids;
ALTER TABLE spaces
    DROP COLUMN groupids;
ALTER TABLE spaces RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE spaces
    MODIFY tenant_id VARCHAR2(50) NULL;
ALTER TABLE spaces
    DROP COLUMN createtime;
ALTER TABLE spaces
    DROP COLUMN lastmodified;
ALTER TABLE spaces
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE spaces
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE spaces
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE spaces
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE spaces
    ADD version NUMBER(20) NULL;
CREATE INDEX i_spaces_created_at ON spaces (created_at);
CREATE INDEX i_spaces_created_by ON spaces (created_by);
CREATE INDEX i_spaces_last_modified_at ON spaces (last_modified_at);
CREATE INDEX i_spaces_last_modified_by ON spaces (last_modified_by);
CREATE INDEX i_spaces_name ON spaces (name);
CREATE INDEX i_spaces_tenant_id ON spaces (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE spaces
set created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
