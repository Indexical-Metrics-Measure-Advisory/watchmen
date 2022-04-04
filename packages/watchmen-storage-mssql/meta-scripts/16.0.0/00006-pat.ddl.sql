CREATE TABLE pats
(
    pat_id      NVARCHAR(50)  NOT NULL,
    token       NVARCHAR(255) NOT NULL,
    user_id     NVARCHAR(50)  NOT NULL,
    username    NVARCHAR(50),
    tenant_id   NVARCHAR(50)  NOT NULL,
    note        NVARCHAR(255),
    expired     DATE,
    permissions NVARCHAR(2048),
    created_at  DATETIME      NOT NULL,
    CONSTRAINT pk_pats PRIMARY KEY (pat_id)
);
CREATE INDEX i_pats_1 ON pats (token);
CREATE INDEX i_pats_2 ON pats (user_id);
CREATE INDEX i_pats_3 ON pats (username);
CREATE INDEX i_pats_4 ON pats (tenant_id);
