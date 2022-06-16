-- noinspection SqlResolveForFile
RENAME TABLE catalogs TO catalogs_1;
RENAME TABLE catalogs_1 TO catalogs;
ALTER TABLE catalogs
    CHANGE catalogid catalog_id VARCHAR(50) NOT NULL;
ALTER TABLE catalogs
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE catalogs
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE catalogs
    CHANGE topicids topic_ids JSON NULL;
ALTER TABLE catalogs
    CHANGE techownerid tech_owner_id VARCHAR(50) NULL;
ALTER TABLE catalogs
    CHANGE bizownerid biz_owner_id VARCHAR(50) NULL;
ALTER TABLE catalogs
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE catalogs
    DROP createtime;
ALTER TABLE catalogs
    DROP lastmodified;
ALTER TABLE catalogs
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE catalogs
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE catalogs
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE catalogs
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE catalogs
    ADD version BIGINT NULL;
CREATE INDEX created_at ON catalogs (created_at);
CREATE INDEX created_by ON catalogs (created_by);
CREATE INDEX last_modified_at ON catalogs (last_modified_at);
CREATE INDEX last_modified_by ON catalogs (last_modified_by);
CREATE INDEX name ON catalogs (name);
CREATE INDEX tech_owner_id ON catalogs (tech_owner_id);
CREATE INDEX biz_owner_id ON catalogs (biz_owner_id);
CREATE INDEX tenant_id ON catalogs (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE catalogs
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
