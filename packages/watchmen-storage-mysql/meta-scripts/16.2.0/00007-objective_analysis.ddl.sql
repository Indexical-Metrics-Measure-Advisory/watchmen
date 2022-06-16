CREATE TABLE objective_analysis
(
    analysis_id      VARCHAR(50) NOT NULL,
    title            VARCHAR(100),
    perspectives     JSON,
    description      VARCHAR(1024),
    user_id          VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    last_visit_time  DATETIME    NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    PRIMARY KEY (analysis_id),
    INDEX (title),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
