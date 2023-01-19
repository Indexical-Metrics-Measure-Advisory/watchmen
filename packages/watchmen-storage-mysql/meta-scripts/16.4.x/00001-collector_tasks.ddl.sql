CREATE TABLE collector_tasks
(
    task_id             VARCHAR(50) NOT NULL,
    resource_id         VARCHAR(50) NOT NULL,
    content             JSON,
    model_name          VARCHAR(50) NOT NULL,
    object_id           VARCHAR(50) NOT NULL,
	dependency          JSON,
	status              TINYINT(1)  NOT NULL,
	result              VARCHAR(500),
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    PRIMARY KEY (task_id),
    UNIQUE KEY unique_name(resource_id),
    INDEX (object_id, model_name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);