CREATE TABLE last_snapshots
(
    language           VARCHAR(20),
    last_dashboard_id  VARCHAR(50),
    admin_dashboard_id VARCHAR(50),
    favorite_pin       TINYINT(1),
    tenant_id          VARCHAR(50) NOT NULL,
    user_id            VARCHAR(50) NOT NULL,
    last_visit_time    DATETIME    NOT NULL,
    PRIMARY KEY (user_id),
    INDEX (tenant_id)
);
