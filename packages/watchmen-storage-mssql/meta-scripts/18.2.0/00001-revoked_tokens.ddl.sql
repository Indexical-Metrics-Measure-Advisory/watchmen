CREATE TABLE revoked_tokens
(
    jti        NVARCHAR(64) NOT NULL,
    user_id    NVARCHAR(50) NOT NULL,
    tenant_id  NVARCHAR(50),
    expires_at DATETIME,
    revoked_at DATETIME     NOT NULL,
    CONSTRAINT pk_revoked_tokens PRIMARY KEY (jti)
);
CREATE INDEX i_revoked_tokens_1 ON revoked_tokens (user_id);
CREATE INDEX i_revoked_tokens_2 ON revoked_tokens (expires_at);
