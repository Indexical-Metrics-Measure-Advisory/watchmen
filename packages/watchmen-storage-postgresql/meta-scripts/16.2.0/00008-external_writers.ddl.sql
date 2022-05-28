CREATE TABLE external_writers
(
    writer_id        VARCHAR(50) NOT NULL,
    writer_code      VARCHAR(50) NOT NULL,
    type             VARCHAR(50) NOT NULL,
    pat              VARCHAR(255),
    url              VARCHAR(255),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
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
