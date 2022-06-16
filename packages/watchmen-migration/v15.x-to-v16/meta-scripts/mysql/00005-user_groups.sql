-- noinspection SqlResolveForFile
RENAME TABLE user_groups TO user_groups_1;
RENAME TABLE user_groups_1 TO user_groups;
ALTER TABLE user_groups
    CHANGE usergroupid user_group_id VARCHAR(50) NOT NULL;
ALTER TABLE user_groups
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE user_groups
    CHANGE userids user_ids JSON NULL;
ALTER TABLE user_groups
    CHANGE spaceids space_ids JSON NULL;
ALTER TABLE user_groups
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE user_groups
    DROP createtime;
ALTER TABLE user_groups
    DROP lastmodified;
ALTER TABLE user_groups
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE user_groups
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE user_groups
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE user_groups
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE user_groups
    ADD version BIGINT NULL;
CREATE INDEX created_at ON user_groups (created_at);
CREATE INDEX created_by ON user_groups (created_by);
CREATE INDEX last_modified_at ON user_groups (last_modified_at);
CREATE INDEX last_modified_by ON user_groups (last_modified_by);
CREATE INDEX name ON user_groups (name);
CREATE INDEX tenant_id ON user_groups (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE user_groups
set created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
