CREATE TABLE users
(
    user_id          NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50),
    nickname         NVARCHAR(50),
    password         NVARCHAR(255),
    is_active        TINYINT      NOT NULL,
    group_ids        NVARCHAR(2048),
    role             NVARCHAR(20) NOT NULL,
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_users PRIMARY KEY (user_id)
);
CREATE UNIQUE INDEX u_users_1 ON users (name);
CREATE INDEX i_users_1 ON users (role);
CREATE INDEX i_users_2 ON users (tenant_id);
CREATE INDEX i_users_3 ON users (created_at);
CREATE INDEX i_users_4 ON users (created_by);
CREATE INDEX i_users_5 ON users (last_modified_at);
CREATE INDEX i_users_6 ON users (last_modified_by);
