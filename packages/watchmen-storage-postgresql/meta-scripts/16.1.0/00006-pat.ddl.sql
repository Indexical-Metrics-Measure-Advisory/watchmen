CREATE TABLE pats
(
    pat_id      VARCHAR(50)  NOT NULL,
    token       VARCHAR(255) NOT NULL,
    user_id     VARCHAR(50)  NOT NULL,
    username    VARCHAR(50),
    tenant_id   VARCHAR(50)  NOT NULL,
    note        VARCHAR(255),
    expired     DATE,
    permissions JSON,
    created_at  TIMESTAMP    NOT NULL,
    CONSTRAINT pk_pats PRIMARY KEY (pat_id)
);
CREATE INDEX i_pats_1 ON pats (token);
CREATE INDEX i_pats_2 ON pats (user_id);
CREATE INDEX i_pats_3 ON pats (username);
CREATE INDEX i_pats_4 ON pats (tenant_id);
