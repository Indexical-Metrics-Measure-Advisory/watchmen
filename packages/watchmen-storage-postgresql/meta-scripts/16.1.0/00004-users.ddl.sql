CREATE TABLE users
(
    user_id          VARCHAR(50) NOT NULL,
    name             VARCHAR(50),
    nickname         VARCHAR(50),
    password         VARCHAR(255),
    is_active        SMALLINT    NOT NULL,
    group_ids        JSON,
    role             VARCHAR(20) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
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
