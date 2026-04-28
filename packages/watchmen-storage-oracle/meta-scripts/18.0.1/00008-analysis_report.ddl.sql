CREATE TABLE analysis_reports
(
    analysis_report_id    VARCHAR2(50)  NOT NULL,
    header                CLOB,
    content               CLOB         NOT NULL,
    challenge_id          VARCHAR2(50)  NOT NULL,
    status                VARCHAR2(50)  NOT NULL,
    user_id               VARCHAR2(50)  NOT NULL,
    tenant_id             VARCHAR2(50)  NOT NULL,
    created_at            DATE     NOT NULL,
    created_by            VARCHAR2(50)  NOT NULL,
    last_modified_at      DATE     NOT NULL,
    last_modified_by      VARCHAR2(50)  NOT NULL,
    version               NUMBER(10),
    CONSTRAINT pk_analysis_reports PRIMARY KEY (analysis_report_id)
);

CREATE INDEX idx_analysis_reports_challenge_id ON analysis_reports (challenge_id);
CREATE INDEX idx_analysis_reports_status ON analysis_reports (status);
CREATE INDEX idx_analysis_reports_tenant_id ON analysis_reports (tenant_id);
CREATE INDEX idx_analysis_reports_user_id ON analysis_reports (user_id);
CREATE INDEX idx_analysis_reports_created_at ON analysis_reports (created_at);
CREATE INDEX idx_analysis_reports_created_by ON analysis_reports (created_by);
CREATE INDEX idx_analysis_reports_last_modified_at ON analysis_reports (last_modified_at);
CREATE INDEX idx_analysis_reports_last_modified_by ON analysis_reports (last_modified_by);