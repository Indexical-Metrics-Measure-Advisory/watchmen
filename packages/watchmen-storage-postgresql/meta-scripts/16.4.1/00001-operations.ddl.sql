CREATE TABLE operations
(
    record_id            VARCHAR(50) NOT NULL,
    operation_type       VARCHAR(20) NOT NULL,
    tuple_type           VARCHAR(20) NOT NULL,
    tuple_key            VARCHAR(20) NOT NULL,
    tuple_id             VARCHAR(100) NOT NULL,
    content              JSON,
    version_num          VARCHAR(50) NOT NULL,
    tenant_id            VARCHAR(50) NOT NULL,
    created_at           TIMESTAMP   NOT NULL,
    created_by           VARCHAR(50) NOT NULL,
    last_modified_at     TIMESTAMP   NOT NULL,
    last_modified_by     VARCHAR(50) NOT NULL,
    CONSTRAINT pk_operations PRIMARY KEY (record_id)
);
CREATE INDEX i_operations_1 ON topics (tenant_id);
CREATE INDEX i_operations_2 ON topics (created_at);
CREATE INDEX i_operations_3 ON topics (created_by);
CREATE INDEX i_operations_4 ON topics (last_modified_at);
CREATE INDEX i_operations_5 ON topics (last_modified_by);