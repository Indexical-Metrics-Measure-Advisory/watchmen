CREATE TABLE derived_objective_reports
(
    derived_objective_report_id VARCHAR(50)  NOT NULL,
    name                        VARCHAR(100) NOT NULL,
    description                 VARCHAR(1024),
    objective_report_id         VARCHAR(50)  NOT NULL,
    definition                  JSON,
    user_id                     VARCHAR(50)  NOT NULL,
    tenant_id                   VARCHAR(50)  NOT NULL,
    last_visit_time             DATETIME     NOT NULL,
    created_at                  DATETIME     NOT NULL,
    created_by                  VARCHAR(50)  NOT NULL,
    last_modified_at            DATETIME     NOT NULL,
    last_modified_by            VARCHAR(50)  NOT NULL,
    PRIMARY KEY (derived_objective_report_id),
    INDEX (name),
    INDEX (objective_report_id),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
