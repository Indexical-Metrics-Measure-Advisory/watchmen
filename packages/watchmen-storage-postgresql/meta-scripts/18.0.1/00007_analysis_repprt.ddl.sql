CREATE TABLE analysis_reports
(
    analysis_report_id    VARCHAR(50)  NOT NULL,
    header                JSONB,
    content               TEXT         NOT NULL,
    challenge_id          VARCHAR(50)  NOT NULL,
    status                VARCHAR(50)  NOT NULL,
    user_id               VARCHAR(50)  NOT NULL,
    tenant_id             VARCHAR(50)  NOT NULL,
    created_at            TIMESTAMP     NOT NULL,
    created_by            VARCHAR(50)  NOT NULL,
    last_modified_at      TIMESTAMP     NOT NULL,
    last_modified_by      VARCHAR(50)  NOT NULL,
    version               INTEGER,
    PRIMARY KEY (analysis_report_id)
);

CREATE INDEX idx_analysis_reports_challenge_id ON analysis_reports (challenge_id);
CREATE INDEX idx_analysis_reports_status ON analysis_reports (status);
CREATE INDEX idx_analysis_reports_tenant_id ON analysis_reports (tenant_id);
CREATE INDEX idx_analysis_reports_user_id ON analysis_reports (user_id);
CREATE INDEX idx_analysis_reports_created_at ON analysis_reports (created_at);
CREATE INDEX idx_analysis_reports_created_by ON analysis_reports (created_by);
CREATE INDEX idx_analysis_reports_last_modified_at ON analysis_reports (last_modified_at);
CREATE INDEX idx_analysis_reports_last_modified_by ON analysis_reports (last_modified_by);