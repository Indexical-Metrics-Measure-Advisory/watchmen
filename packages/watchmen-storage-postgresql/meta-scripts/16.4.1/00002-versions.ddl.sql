CREATE TABLE versions
(
    version_id           VARCHAR(50) NOT NULL,
    previous_version     VARCHAR(20) NOT NULL,
    current_version      VARCHAR(20) NOT NULL,
    tenant_id            VARCHAR(50) NOT NULL,
    created_at           DATETIME    NOT NULL,
    created_by           VARCHAR(50) NOT NULL,
    last_modified_at     DATETIME    NOT NULL,
    last_modified_by     VARCHAR(50) NOT NULL,
    CONSTRAINT pk_versions PRIMARY KEY (version_id)
);
CREATE INDEX i_operations_1 ON topics (tenant_id);
CREATE INDEX i_operations_2 ON topics (created_at);
CREATE INDEX i_operations_3 ON topics (created_by);
CREATE INDEX i_operations_4 ON topics (last_modified_at);
CREATE INDEX i_operations_5 ON topics (last_modified_by);