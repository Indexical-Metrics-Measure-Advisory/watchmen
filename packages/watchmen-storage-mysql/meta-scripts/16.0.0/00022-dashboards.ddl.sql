CREATE TABLE dashboards
(
    dashboard_id          VARCHAR(50) NOT NULL,
    name                  VARCHAR(50) NOT NULL,
    reports               JSON,
    paragraphs            JSON,
    auto_refresh_interval BIGINT,
    user_id               VARCHAR(50) NOT NULL,
    tenant_id             VARCHAR(50) NOT NULL,
    last_visit_time       DATETIME    NULL,
    created_at            DATETIME    NOT NULL,
    created_by            VARCHAR(50) NOT NULL,
    last_modified_at      DATETIME    NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    PRIMARY KEY (dashboard_id),
    INDEX (name),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
