CREATE TABLE audit_log
(
    audit_id       NVARCHAR(50) NOT NULL,
    tenant_id      NVARCHAR(50),
    user_id        NVARCHAR(50),
    user_name      NVARCHAR(100),
    operation_type NVARCHAR(20) NOT NULL,
    resource       NVARCHAR(50),
    detail        NVARCHAR(512),
    method         NVARCHAR(16),
    path           NVARCHAR(512),
    query_string   NVARCHAR(1024),
    success        BIT,
    duration_ms    BIGINT,
    client_ip      NVARCHAR(64),
    user_agent     NVARCHAR(512),
    occurred_at    DATETIME2    NOT NULL,
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_id)
);
CREATE INDEX i_audit_log_1 ON audit_log (occurred_at);
CREATE INDEX i_audit_log_2 ON audit_log (tenant_id);
CREATE INDEX i_audit_log_3 ON audit_log (user_name);
CREATE INDEX i_audit_log_4 ON audit_log (operation_type);
CREATE INDEX i_audit_log_5 ON audit_log (resource);
