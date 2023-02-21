CREATE TABLE objectives
(
    objective_id     VARCHAR(50) NOT NULL,
    name             VARCHAR(100),
    description      VARCHAR(1024),
    time_frame       JSON,
    targets          JSON,
    variables        JSON,
    factors          JSON,
    group_ids        JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_id)
);
CREATE INDEX i_objectives_1 ON objectives (name);
CREATE INDEX i_objectives_2 ON objectives (tenant_id);
CREATE INDEX i_objectives_3 ON objectives (created_at);
CREATE INDEX i_objectives_4 ON objectives (created_by);
CREATE INDEX i_objectives_5 ON objectives (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives (last_modified_by);
