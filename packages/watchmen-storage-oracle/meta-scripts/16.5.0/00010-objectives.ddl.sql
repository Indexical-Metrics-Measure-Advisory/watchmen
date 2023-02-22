CREATE TABLE objectives
(
    objective_id     VARCHAR2(50) NOT NULL,
    name             VARCHAR2(100),
    description      VARCHAR2(1024),
    time_frame       CLOB,
    targets          CLOB,
    variables        CLOB,
    factors          CLOB,
    group_ids        VARCHAR2(2048),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_id)
);
CREATE INDEX i_objectives_1 ON objectives (name);
CREATE INDEX i_objectives_2 ON objectives (tenant_id);
CREATE INDEX i_objectives_3 ON objectives (created_at);
CREATE INDEX i_objectives_4 ON objectives (created_by);
CREATE INDEX i_objectives_5 ON objectives (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives (last_modified_by);
