CREATE TABLE pats
(
    pat_id      VARCHAR2(50)  NOT NULL,
    token       VARCHAR2(255) NOT NULL,
    user_id     VARCHAR2(50)  NOT NULL,
    username    VARCHAR2(50),
    tenant_id   VARCHAR2(50)  NOT NULL,
    note        VARCHAR2(255),
    expired     DATE,
    permissions VARCHAR2(2048),
    created_at  DATE          NOT NULL,
    CONSTRAINT pk_pats PRIMARY KEY (pat_id)
);
CREATE INDEX i_pats_1 ON pats (token);
CREATE INDEX i_pats_2 ON pats (user_id);
CREATE INDEX i_pats_3 ON pats (username);
CREATE INDEX i_pats_4 ON pats (tenant_id);
