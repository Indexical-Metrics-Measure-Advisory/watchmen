CREATE TABLE favorites
(
    connected_space_ids JSON,
    dashboard_ids       JSON,
    tenant_id           VARCHAR(50) NOT NULL,
    user_id             VARCHAR(50) NOT NULL,
    last_visit_time     DATETIME    NOT NULL,
    PRIMARY KEY (user_id),
    INDEX (tenant_id)
);
