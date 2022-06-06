ALTER TABLE users RENAME TO users_1;
ALTER TABLE users_1 RENAME TO users;
ALTER TABLE users RENAME COLUMN userid TO user_id;
ALTER TABLE users
    MODIFY user_id VARCHAR2(50);
ALTER TABLE users
    MODIFY nickname VARCHAR2(50);
ALTER TABLE users
    MODIFY password VARCHAR2(255);
ALTER TABLE users
    MODIFY is_active NUMBER(1) NOT NULL;
ALTER TABLE users
    ADD group_ids VARCHAR2(2048) NULL;
-- noinspection SqlWithoutWhere
UPDATE users
SET group_ids = groupids;
ALTER TABLE users
    DROP COLUMN groupids;
ALTER TABLE users
    MODIFY role VARCHAR2(20) NOT NULL;
ALTER TABLE users RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE users
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE users
    DROP COLUMN createtime;
ALTER TABLE users
    DROP COLUMN lastmodified;
ALTER TABLE users
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE users
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE users
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE users
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE users
    ADD version NUMBER(20) NULL;
CREATE INDEX i_users_created_at ON users (created_at);
CREATE INDEX i_users_created_by ON users (created_by);
CREATE INDEX i_users_last_modified_at ON users (last_modified_at);
CREATE INDEX i_users_last_modified_by ON users (last_modified_by);
CREATE INDEX i_users_role ON users (role);
CREATE INDEX i_users_tenant_id ON users (tenant_id);
CREATE UNIQUE INDEX u_users_name ON users (name);
-- noinspection SqlWithoutWhere
UPDATE users
set created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
