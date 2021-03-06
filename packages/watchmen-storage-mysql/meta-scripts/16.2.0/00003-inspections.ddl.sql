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
    created_at                DATETIME    NOT NULL,
    created_by                VARCHAR(50) NOT NULL,
    last_modified_at          DATETIME    NOT NULL,
    last_modified_by          VARCHAR(50) NOT NULL,
    PRIMARY KEY (inspection_id),
    INDEX (name),
    INDEX (indicator_id),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
