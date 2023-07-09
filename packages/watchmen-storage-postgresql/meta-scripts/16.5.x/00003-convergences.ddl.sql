CREATE TABLE convergences
(
    convergence_id   VARCHAR(50) NOT NULL,
    name             VARCHAR(100),
    description      VARCHAR(1024),
    targets          JSON,
    variables        JSON,
    group_ids        JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_convergences PRIMARY KEY (convergence_id)
);
CREATE INDEX i_convergences_1 ON convergences (name);
CREATE INDEX i_convergences_2 ON convergences (tenant_id);
CREATE INDEX i_convergences_3 ON convergences (created_at);
CREATE INDEX i_convergences_4 ON convergences (created_by);
CREATE INDEX i_convergences_5 ON convergences (last_modified_at);
CREATE INDEX i_convergences_6 ON convergences (last_modified_by);
