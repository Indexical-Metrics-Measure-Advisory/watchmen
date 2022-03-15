CREATE TABLE users
(
    user_id          VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50),
    nickname         VARCHAR2(50),
    password         VARCHAR2(255),
    is_active        NUMBER(1)    NOT NULL,
    group_ids        VARCHAR(2048),
    role             VARCHAR2(20) NOT NULL,
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_users PRIMARY KEY (user_id)
);
CREATE UNIQUE INDEX u_users_1 ON users (name);
CREATE INDEX i_users_1 ON users (role);
CREATE INDEX i_users_2 ON users (tenant_id);
CREATE INDEX i_users_3 ON users (created_at);
CREATE INDEX i_users_4 ON users (created_by);
CREATE INDEX i_users_5 ON users (last_modified_at);
CREATE INDEX i_users_6 ON users (last_modified_by);
