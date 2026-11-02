CREATE TABLE revoked_tokens
(
    jti        VARCHAR(64) NOT NULL,
    user_id    VARCHAR(50) NOT NULL,
    tenant_id  VARCHAR(50),
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP NOT NULL,
    CONSTRAINT pk_revoked_tokens PRIMARY KEY (jti)
);
CREATE INDEX i_revoked_tokens_1 ON revoked_tokens (user_id);
CREATE INDEX i_revoked_tokens_2 ON revoked_tokens (expires_at);
