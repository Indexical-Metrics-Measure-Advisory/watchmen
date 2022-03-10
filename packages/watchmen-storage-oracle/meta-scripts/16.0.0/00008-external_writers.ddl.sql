CREATE TABLE external_writers
(
    writer_id        VARCHAR2(50) NOT NULL,
    writer_code      VARCHAR2(50) NOT NULL,
    type             VARCHAR2(50) NOT NULL,
    pat              VARCHAR2(255),
    url              VARCHAR2(255),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_external_writers PRIMARY KEY (writer_id)
);
CREATE UNIQUE INDEX u_external_writers_1 ON external_writers (writer_code, tenant_id);
CREATE INDEX i_external_writers_1 ON external_writers (writer_code);
CREATE INDEX i_external_writers_2 ON external_writers (type);
CREATE INDEX i_external_writers_3 ON external_writers (tenant_id);
CREATE INDEX i_external_writers_4 ON external_writers (created_at);
CREATE INDEX i_external_writers_5 ON external_writers (created_by);
CREATE INDEX i_external_writers_6 ON external_writers (last_modified_at);
CREATE INDEX i_external_writers_7 ON external_writers (last_modified_by);
