CREATE TABLE materialization_flows
(
    id                  VARCHAR(50) NOT NULL,
    name                VARCHAR(200),
    materialization_ids JSON,
    frequency           VARCHAR(20),
    time                VARCHAR(10),
    date                VARCHAR(20),
    weekday             VARCHAR(10),
    day_of_month        INT,
    schedule_enabled    TINYINT     NOT NULL,
    enabled             TINYINT     NOT NULL,
    description         VARCHAR(1024),
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    user_id             VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    INDEX (tenant_id),
    INDEX (user_id)
);
