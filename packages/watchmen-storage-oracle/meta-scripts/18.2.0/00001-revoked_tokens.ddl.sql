CREATE TABLE revoked_tokens
(
    jti        VARCHAR2(64) NOT NULL,
    user_id    VARCHAR2(50) NOT NULL,
    tenant_id  VARCHAR2(50),
    expires_at DATE,
    revoked_at DATE         NOT NULL,
    CONSTRAINT pk_revoked_tokens PRIMARY KEY (jti)
);
CREATE INDEX i_revoked_tokens_1 ON revoked_tokens (user_id);
CREATE INDEX i_revoked_tokens_2 ON revoked_tokens (expires_at);
