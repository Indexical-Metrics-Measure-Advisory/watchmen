CREATE TABLE achievement_plugin_tasks
(
    achievement_task_id VARCHAR(50) NOT NULL,
    achievement_id      VARCHAR(50) NOT NULL,
    plugin_id           VARCHAR(50) NOT NULL,
    status              VARCHAR(10) NOT NULL,
    url                 VARCHAR(512),
    user_id             VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    PRIMARY KEY (achievement_task_id),
    INDEX (achievement_id),
    INDEX (plugin_id),
    INDEX (status),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
