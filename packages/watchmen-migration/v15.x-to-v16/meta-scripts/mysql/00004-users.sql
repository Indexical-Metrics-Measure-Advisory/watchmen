-- noinspection SqlResolveForFile
RENAME TABLE users TO users_1;
RENAME TABLE users_1 TO users;
ALTER TABLE users
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE users
    MODIFY nickname VARCHAR(50) NULL;
ALTER TABLE users
    MODIFY password VARCHAR(255) NULL;
ALTER TABLE users
    MODIFY is_active TINYINT(1) NOT NULL;
ALTER TABLE users
    CHANGE groupids group_ids JSON NULL;
ALTER TABLE users
    MODIFY role VARCHAR(20) NOT NULL;
ALTER TABLE users
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE users
    DROP createtime;
ALTER TABLE users
    DROP lastmodified;
ALTER TABLE users
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE users
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE users
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE users
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE users
    ADD version BIGINT NULL;
CREATE INDEX created_at ON users (created_at);
CREATE INDEX created_by ON users (created_by);
CREATE INDEX last_modified_at ON users (last_modified_at);
CREATE INDEX last_modified_by ON users (last_modified_by);
CREATE INDEX role ON users (role);
CREATE INDEX tenant_id ON users (tenant_id);
CREATE UNIQUE INDEX name ON users (name);
-- noinspection SqlWithoutWhere
UPDATE users
set created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
