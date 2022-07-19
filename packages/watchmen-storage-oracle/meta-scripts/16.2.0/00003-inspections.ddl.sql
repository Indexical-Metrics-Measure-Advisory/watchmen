CREATE TABLE inspections
(
    inspection_id             VARCHAR2(50) NOT NULL,
    name                      VARCHAR2(50),
    indicator_id              VARCHAR2(50),
    aggregate_arithmetics     VARCHAR2(128),
    measure_on                VARCHAR2(10),
    measure_on_factor_id      VARCHAR2(50),
    measure_on_bucket_id      VARCHAR2(50),
    time_range_measure        VARCHAR2(20),
    time_range_factor_id      VARCHAR2(50),
    time_ranges               VARCHAR2(1024),
    measure_on_time           VARCHAR2(20),
    measure_on_time_factor_id VARCHAR2(50),
    criteria                  CLOB,
    user_id                   VARCHAR2(50) NOT NULL,
    tenant_id                 VARCHAR2(50) NOT NULL,
    created_at                DATE         NOT NULL,
    created_by                VARCHAR2(50) NOT NULL,
    last_modified_at          DATE         NOT NULL,
    last_modified_by          VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_inspections PRIMARY KEY (inspection_id)
);
CREATE INDEX i_inspections_1 ON inspections (name);
CREATE INDEX i_inspections_2 ON inspections (indicator_id);
CREATE INDEX i_inspections_3 ON inspections (user_id);
CREATE INDEX i_inspections_4 ON inspections (tenant_id);
CREATE INDEX i_inspections_5 ON inspections (created_at);
CREATE INDEX i_inspections_6 ON inspections (created_by);
CREATE INDEX i_inspections_7 ON inspections (last_modified_at);
CREATE INDEX i_inspections_8 ON inspections (last_modified_by);
