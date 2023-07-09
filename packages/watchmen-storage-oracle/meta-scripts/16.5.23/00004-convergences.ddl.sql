CREATE TABLE convergences
(
    convergence_id   VARCHAR2(50) NOT NULL,
    name             VARCHAR2(100),
    description      VARCHAR2(1024),
    targets          CLOB,
    variables        CLOB,
    group_ids        VARCHAR2(2048),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_convergences PRIMARY KEY (convergence_id)
);
CREATE INDEX i_convergences_1 ON convergences (name);
CREATE INDEX i_convergences_2 ON convergences (tenant_id);
CREATE INDEX i_convergences_3 ON convergences (created_at);
CREATE INDEX i_convergences_4 ON convergences (created_by);
CREATE INDEX i_convergences_5 ON convergences (last_modified_at);
CREATE INDEX i_convergences_6 ON convergences (last_modified_by);
