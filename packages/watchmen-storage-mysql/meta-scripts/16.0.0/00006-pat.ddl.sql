CREATE TABLE pats
(
    pat_id      VARCHAR(50)  NOT NULL,
    token       VARCHAR(255) NOT NULL,
    user_id     VARCHAR(50)  NOT NULL,
    username    VARCHAR(50),
    tenant_id   VARCHAR(50)  NOT NULL,
    note        VARCHAR(255),
    expired     DATETIME,
    permissions JSON,
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (pat_id),
    INDEX (token),
    INDEX (user_id),
    INDEX (username),
    INDEX (tenant_id)
);
