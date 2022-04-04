CREATE TABLE data_sources
(
    data_source_id   NVARCHAR(50) NOT NULL,
    data_source_code NVARCHAR(50) NOT NULL,
    data_source_type NVARCHAR(20) NOT NULL,
    host             NVARCHAR(50),
    port             NVARCHAR(5),
    username         NVARCHAR(50),
    password         NVARCHAR(50),
    name             NVARCHAR(50),
    url              NVARCHAR(255),
    params           NVARCHAR(2048),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_data_sources PRIMARY KEY (data_source_id)
);
CREATE INDEX i_data_sources_1 ON data_sources (data_source_code);
CREATE INDEX i_data_sources_2 ON data_sources (data_source_type);
CREATE INDEX i_data_sources_3 ON data_sources (tenant_id);
CREATE INDEX i_data_sources_4 ON data_sources (created_at);
CREATE INDEX i_data_sources_5 ON data_sources (created_by);
CREATE INDEX i_data_sources_6 ON data_sources (last_modified_at);
CREATE INDEX i_data_sources_7 ON data_sources (last_modified_by);
