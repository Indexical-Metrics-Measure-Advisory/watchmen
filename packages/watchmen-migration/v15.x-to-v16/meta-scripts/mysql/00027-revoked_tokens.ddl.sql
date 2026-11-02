CREATE TABLE revoked_tokens
(
    jti        VARCHAR(64) NOT NULL,
    user_id    VARCHAR(50) NOT NULL,
    tenant_id  VARCHAR(50),
    expires_at DATETIME,
    revoked_at DATETIME   NOT NULL,
    PRIMARY KEY (jti),
    INDEX (user_id),
    INDEX (expires_at)
);
