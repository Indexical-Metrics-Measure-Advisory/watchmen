CREATE TABLE users
(
    user_id          VARCHAR(50) NOT NULL,
    name             VARCHAR(50),
    nickname         VARCHAR(50),
    password         VARCHAR(255),
    is_active        TINYINT(1)  NOT NULL,
    group_ids        JSON,
    role             VARCHAR(20) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (user_id),
    UNIQUE INDEX (name),
    INDEX (role),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
