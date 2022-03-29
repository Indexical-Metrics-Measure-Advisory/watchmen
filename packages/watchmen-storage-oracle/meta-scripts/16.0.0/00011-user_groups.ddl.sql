CREATE TABLE user_groups
(
    user_group_id    VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50) NOT NULL,
    description      VARCHAR2(1024),
    user_ids         VARCHAR2(2048),
    space_ids        VARCHAR2(2048),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_user_groups PRIMARY KEY (user_group_id)
);
CREATE INDEX i_user_groups_1 ON user_groups (name);
CREATE INDEX i_user_groups_2 ON user_groups (tenant_id);
CREATE INDEX i_user_groups_3 ON user_groups (created_at);
CREATE INDEX i_user_groups_4 ON user_groups (created_by);
CREATE INDEX i_user_groups_5 ON user_groups (last_modified_at);
CREATE INDEX i_user_groups_6 ON user_groups (last_modified_by);
