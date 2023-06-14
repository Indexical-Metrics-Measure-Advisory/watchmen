CREATE TABLE objectives_reports
(
    objective_report_id VARCHAR(50) NOT NULL,
    name                VARCHAR(100),
    time_frame          JSON,
    variables           JSON,
    cell                JSON,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             BIGINT,
    PRIMARY KEY (objective_report_id),
    INDEX (name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);


