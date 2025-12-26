CREATE TABLE inspections
(
    inspection_id             VARCHAR(50) NOT NULL,
    name                      VARCHAR(50),
    indicator_id              VARCHAR(50),
    aggregate_arithmetics     VARCHAR(128),
    measure_on                VARCHAR(10),
    measure_on_factor_id      VARCHAR(50),
    measure_on_bucket_id      VARCHAR(50),
    time_range_measure        VARCHAR(20),
    time_range_factor_id      VARCHAR(50),
    time_ranges               VARCHAR(1024),
    measure_on_time           VARCHAR(20),
    measure_on_time_factor_id VARCHAR(50),
    user_id                   VARCHAR(50) NOT NULL,
    tenant_id                 VARCHAR(50) NOT NULL,
    created_at                TIMESTAMP   NOT NULL,
    created_by                VARCHAR(50) NOT NULL,
    last_modified_at          TIMESTAMP   NOT NULL,
    last_modified_by          VARCHAR(50) NOT NULL,
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
