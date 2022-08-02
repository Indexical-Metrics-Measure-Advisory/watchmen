CREATE TABLE data_sources
(
    data_source_id   VARCHAR2(50) NOT NULL,
    data_source_code VARCHAR2(50) NOT NULL,
    data_source_type VARCHAR2(20) NOT NULL,
    host             VARCHAR2(50),
    port             VARCHAR2(5),
    username         VARCHAR2(50),
    password         VARCHAR2(50),
    name             VARCHAR2(50),
    url              VARCHAR2(255),
    params           VARCHAR2(2048),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_data_sources PRIMARY KEY (data_source_id)
);
CREATE INDEX i_data_sources_1 ON data_sources (data_source_code);
CREATE INDEX i_data_sources_2 ON data_sources (data_source_type);
CREATE INDEX i_data_sources_3 ON data_sources (tenant_id);
CREATE INDEX i_data_sources_4 ON data_sources (created_at);
CREATE INDEX i_data_sources_5 ON data_sources (created_by);
CREATE INDEX i_data_sources_6 ON data_sources (last_modified_at);
CREATE INDEX i_data_sources_7 ON data_sources (last_modified_by);
