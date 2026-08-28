CREATE TABLE audit_log
(
    audit_id       VARCHAR(50) NOT NULL,
    tenant_id      VARCHAR(50),
    user_id        VARCHAR(50),
    user_name      VARCHAR(100),
    operation_type VARCHAR(20)  NOT NULL,
    resource       VARCHAR(50),
    detail        VARCHAR(512),
    method         VARCHAR(16),
    path           VARCHAR(512),
    query_string   VARCHAR(1024),
    success        BOOLEAN,
    duration_ms    BIGINT,
    client_ip      VARCHAR(64),
    user_agent     VARCHAR(512),
    occurred_at    DATETIME    NOT NULL,
    PRIMARY KEY (audit_id),
    INDEX (occurred_at),
    INDEX (tenant_id),
    INDEX (user_name),
    INDEX (operation_type),
    INDEX (resource)
);
