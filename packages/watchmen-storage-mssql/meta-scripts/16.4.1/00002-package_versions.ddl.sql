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
CREATE INDEX i_package_versions_1 ON package_versions (tenant_id);
CREATE INDEX i_package_versions_2 ON package_versions (created_at);
CREATE INDEX i_package_versions_3 ON package_versions (created_by);
CREATE INDEX i_package_versions_4 ON package_versions (last_modified_at);
CREATE INDEX i_package_versions_5 ON package_versions (last_modified_by);