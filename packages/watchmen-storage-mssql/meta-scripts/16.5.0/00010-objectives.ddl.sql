CREATE TABLE objectives
(
    objective_id     NVARCHAR(50) NOT NULL,
    name             NVARCHAR(100),
    description      NVARCHAR(1024),
    time_frame       NVARCHAR(MAX),
    targets          NVARCHAR(MAX),
    variables        NVARCHAR(MAX),
    factors          NVARCHAR(MAX),
    group_ids        NVARCHAR(2048),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_id)
);
CREATE INDEX i_objectives_1 ON objectives (name);
CREATE INDEX i_objectives_2 ON objectives (tenant_id);
CREATE INDEX i_objectives_3 ON objectives (created_at);
CREATE INDEX i_objectives_4 ON objectives (created_by);
CREATE INDEX i_objectives_5 ON objectives (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives (last_modified_by);
