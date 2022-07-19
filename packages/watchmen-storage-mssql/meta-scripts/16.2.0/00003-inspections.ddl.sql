CREATE TABLE inspections
(
    inspection_id             NVARCHAR(50) NOT NULL,
    name                      NVARCHAR(50),
    indicator_id              NVARCHAR(50),
    aggregate_arithmetics     NVARCHAR(128),
    measure_on                NVARCHAR(10),
    measure_on_factor_id      NVARCHAR(50),
    measure_on_bucket_id      NVARCHAR(50),
    time_range_measure        NVARCHAR(20),
    time_range_factor_id      NVARCHAR(50),
    time_ranges               NVARCHAR(1024),
    measure_on_time           NVARCHAR(20),
    measure_on_time_factor_id NVARCHAR(50),
    criteria                  NVARCHAR(MAX),
    user_id                   NVARCHAR(50) NOT NULL,
    tenant_id                 NVARCHAR(50) NOT NULL,
    created_at                DATETIME     NOT NULL,
    created_by                NVARCHAR(50) NOT NULL,
    last_modified_at          DATETIME     NOT NULL,
    last_modified_by          NVARCHAR(50) NOT NULL,
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
