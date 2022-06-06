-- noinspection SqlResolveForFile
ALTER TABLE catalogs RENAME TO catalogs_1;
ALTER TABLE catalogs_1 RENAME TO catalogs;
ALTER TABLE catalogs RENAME COLUMN catalogid TO catalog_id;
ALTER TABLE catalogs
    MODIFY catalog_id VARCHAR2(50);
ALTER TABLE catalogs
    MODIFY name VARCHAR2(50) NOT NULL;
ALTER TABLE catalogs
    MODIFY description VARCHAR2(1024);
ALTER TABLE catalogs
    ADD topic_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE catalogs
SET topic_ids = topicids;
ALTER TABLE catalogs
    DROP COLUMN topicids;
ALTER TABLE catalogs RENAME COLUMN techownerid TO tech_owner_id;
ALTER TABLE catalogs
    MODIFY tech_owner_id VARCHAR2(50);
ALTER TABLE catalogs RENAME COLUMN bizownerid TO biz_owner_id;
ALTER TABLE catalogs
    MODIFY biz_owner_id VARCHAR2(50);
ALTER TABLE catalogs RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE catalogs
    MODIFY tenant_id VARCHAR2(50) NOT NULL;
ALTER TABLE catalogs
    DROP COLUMN createtime;
ALTER TABLE catalogs
    DROP COLUMN lastmodified;
ALTER TABLE catalogs
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE catalogs
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE catalogs
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE catalogs
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE catalogs
    ADD version NUMBER(20) NULL;
CREATE INDEX i_catalogs_created_at ON catalogs (created_at);
CREATE INDEX i_catalogs_created_by ON catalogs (created_by);
CREATE INDEX i_catalogs_last_modified_at ON catalogs (last_modified_at);
CREATE INDEX i_catalogs_last_modified_by ON catalogs (last_modified_by);
CREATE INDEX i_catalogs_name ON catalogs (name);
CREATE INDEX i_catalogs_tech_owner_id ON catalogs (tech_owner_id);
CREATE INDEX i_catalogs_biz_owner_id ON catalogs (biz_owner_id);
CREATE INDEX i_catalogs_tenant_id ON catalogs (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE catalogs
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
