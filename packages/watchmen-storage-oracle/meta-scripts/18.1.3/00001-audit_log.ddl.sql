CREATE TABLE audit_log
(
    audit_id       VARCHAR2(50) NOT NULL,
    tenant_id      VARCHAR2(50),
    user_id        VARCHAR2(50),
    user_name      VARCHAR2(100),
    operation_type VARCHAR2(20) NOT NULL,
    resource       VARCHAR2(50),
    detail        VARCHAR2(512),
    method         VARCHAR2(16),
    path           VARCHAR2(512),
    query_string   VARCHAR2(1024),
    success        NUMBER(1),
    duration_ms    NUMBER(20),
    client_ip      VARCHAR2(64),
    user_agent     VARCHAR2(512),
    occurred_at    DATE         NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_id)
);
CREATE INDEX i_audit_log_1 ON audit_log (occurred_at);
CREATE INDEX i_audit_log_2 ON audit_log (tenant_id);
CREATE INDEX i_audit_log_3 ON audit_log (user_name);
CREATE INDEX i_audit_log_4 ON audit_log (operation_type);
CREATE INDEX i_audit_log_5 ON audit_log (resource);
