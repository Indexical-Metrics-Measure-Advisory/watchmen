CREATE TABLE user_groups
(
    user_group_id    VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    description      VARCHAR(1024),
    user_ids         JSON,
    space_ids        JSON,
    indicator_ids    JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_user_groups PRIMARY KEY (user_group_id)
);
CREATE INDEX i_user_groups_1 ON user_groups (name);
CREATE INDEX i_user_groups_2 ON user_groups (tenant_id);
CREATE INDEX i_user_groups_3 ON user_groups (created_at);
CREATE INDEX i_user_groups_4 ON user_groups (created_by);
CREATE INDEX i_user_groups_5 ON user_groups (last_modified_at);
CREATE INDEX i_user_groups_6 ON user_groups (last_modified_by);
