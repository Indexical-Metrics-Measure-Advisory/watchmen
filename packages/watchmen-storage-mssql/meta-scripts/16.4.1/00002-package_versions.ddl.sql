CREATE TABLE package_versions
(
    version_id           NVARCHAR(50) NOT NULL,
    previous_version     NVARCHAR(20) NOT NULL,
    current_version      NVARCHAR(20) NOT NULL,
    tenant_id            NVARCHAR(50) NOT NULL,
    created_at           DATETIME    NOT NULL,
    created_by           NVARCHAR(50) NOT NULL,
    last_modified_at     DATETIME    NOT NULL,
    last_modified_by     NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_versions PRIMARY KEY (version_id)
);
CREATE INDEX i_operations_1 ON operations (tenant_id);
CREATE INDEX i_operations_2 ON operations (created_at);
CREATE INDEX i_operations_3 ON operations (created_by);
CREATE INDEX i_operations_4 ON operations (last_modified_at);
CREATE INDEX i_operations_5 ON operations (last_modified_by);