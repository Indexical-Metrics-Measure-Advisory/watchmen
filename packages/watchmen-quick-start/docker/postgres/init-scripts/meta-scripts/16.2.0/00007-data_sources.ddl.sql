CREATE TABLE data_sources
(
    data_source_id   VARCHAR(50) NOT NULL,
    data_source_code VARCHAR(50) NOT NULL,
    data_source_type VARCHAR(20) NOT NULL,
    host             VARCHAR(50),
    port             VARCHAR(5),
    username         VARCHAR(50),
    password         VARCHAR(50),
    name             VARCHAR(50),
    url              VARCHAR(255),
    params           JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
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
