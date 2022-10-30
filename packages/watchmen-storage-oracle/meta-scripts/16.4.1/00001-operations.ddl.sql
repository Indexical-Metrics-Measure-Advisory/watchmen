CREATE TABLE operations
(
    record_id            VARCHAR2(50) NOT NULL,
    tuple_type           VARCHAR2(20) NOT NULL,
    tuple_id             VARCHAR2(100) NOT NULL,
    content              CLOB,
    version_num          VARCHAR2(50) NOT NULL,
    tenant_id            VARCHAR2(50) NOT NULL,
    created_at           DATE         NOT NULL,
    created_by           VARCHAR2(50) NOT NULL,
    last_modified_at     DATE         NOT NULL,
    last_modified_by     VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_operations PRIMARY KEY (record_id)
);
CREATE INDEX i_operations_1 ON operations (tenant_id);
CREATE INDEX i_operations_2 ON operations (created_at);
CREATE INDEX i_operations_3 ON operations (created_by);
CREATE INDEX i_operations_4 ON operations (last_modified_at);
CREATE INDEX i_operations_5 ON operations (last_modified_by);