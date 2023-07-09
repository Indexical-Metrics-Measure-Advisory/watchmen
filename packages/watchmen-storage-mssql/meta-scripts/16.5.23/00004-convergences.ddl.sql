CREATE TABLE convergences
(
    convergence_id   NVARCHAR(50) NOT NULL,
    name             NVARCHAR(100),
    description      NVARCHAR(1024),
    targets          NVARCHAR(MAX),
    variables        NVARCHAR(MAX),
    group_ids        NVARCHAR(2048),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_convergences PRIMARY KEY (convergence_id)
);
CREATE INDEX i_convergences_1 ON convergences (name);
CREATE INDEX i_convergences_2 ON convergences (tenant_id);
CREATE INDEX i_convergences_3 ON convergences (created_at);
CREATE INDEX i_convergences_4 ON convergences (created_by);
CREATE INDEX i_convergences_5 ON convergences (last_modified_at);
CREATE INDEX i_convergences_6 ON convergences (last_modified_by);
