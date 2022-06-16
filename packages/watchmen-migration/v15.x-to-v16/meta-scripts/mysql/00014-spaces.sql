-- noinspection SqlResolveForFile
RENAME TABLE spaces TO spaces_1;
RENAME TABLE spaces_1 TO spaces;
ALTER TABLE spaces
    CHANGE spaceid space_id VARCHAR(50) NOT NULL;
ALTER TABLE spaces
    MODIFY name VARCHAR(50) NOT NULL;
ALTER TABLE spaces
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE spaces
    CHANGE topicids topic_ids JSON NULL;
ALTER TABLE spaces
    CHANGE groupids group_ids JSON NULL;
ALTER TABLE spaces
    CHANGE tenantid tenant_id VARCHAR(50) NULL;
ALTER TABLE spaces
    DROP createtime;
ALTER TABLE spaces
    DROP lastmodified;
ALTER TABLE spaces
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE spaces
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE spaces
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE spaces
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE spaces
    ADD version BIGINT NULL;
CREATE INDEX created_at ON spaces (created_at);
CREATE INDEX created_by ON spaces (created_by);
CREATE INDEX last_modified_at ON spaces (last_modified_at);
CREATE INDEX last_modified_by ON spaces (last_modified_by);
CREATE INDEX name ON spaces (name);
CREATE INDEX tenant_id ON spaces (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE spaces
set created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
