ALTER TABLE user_groups RENAME TO user_groups_1;
ALTER TABLE user_groups_1 RENAME TO user_groups;
ALTER TABLE user_groups RENAME COLUMN usergroupid TO user_group_id;
ALTER TABLE user_groups
    MODIFY user_group_id VARCHAR2(50);
ALTER TABLE user_groups
    MODIFY description VARCHAR2(1024);
ALTER TABLE user_groups
    ADD user_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE user_groups
SET user_ids = userids;
ALTER TABLE user_groups
    DROP COLUMN userids;
ALTER TABLE user_groups
    ADD space_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE user_groups
SET space_ids = spaceids;
ALTER TABLE user_groups
    DROP COLUMN spaceids;
ALTER TABLE user_groups RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE user_groups
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE user_groups
    DROP COLUMN createtime;
ALTER TABLE user_groups
    DROP COLUMN lastmodified;
ALTER TABLE user_groups
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE user_groups
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE user_groups
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE user_groups
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE user_groups
    ADD version NUMBER(20) NULL;
CREATE INDEX i_user_groups_created_at ON user_groups (created_at);
CREATE INDEX i_user_groups_created_by ON user_groups (created_by);
CREATE INDEX i_user_groups_last_modified_at ON user_groups (last_modified_at);
CREATE INDEX i_user_groups_last_modified_by ON user_groups (last_modified_by);
CREATE INDEX i_user_groups_name ON user_groups (name);
CREATE INDEX i_user_groups_tenant_id ON user_groups (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE user_groups
set created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
