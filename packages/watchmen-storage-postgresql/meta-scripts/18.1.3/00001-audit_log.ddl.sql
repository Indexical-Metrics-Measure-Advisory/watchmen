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
    occurred_at    TIMESTAMP    NOT NULL,
    PRIMARY KEY (audit_id)
);
CREATE INDEX i_audit_log_1 ON audit_log (occurred_at);
CREATE INDEX i_audit_log_2 ON audit_log (tenant_id);
CREATE INDEX i_audit_log_3 ON audit_log (user_name);
CREATE INDEX i_audit_log_4 ON audit_log (operation_type);
CREATE INDEX i_audit_log_5 ON audit_log (resource);
