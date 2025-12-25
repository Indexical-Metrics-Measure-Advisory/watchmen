CREATE TABLE analysis_reports
(
    analysis_report_id    VARCHAR(50)  NOT NULL,
    header                JSON,
    content               TEXT         NOT NULL,
    challenge_id          VARCHAR(50)  NOT NULL,
    status                VARCHAR(50)  NOT NULL,
    user_id               VARCHAR(50)  NOT NULL,
    tenant_id             VARCHAR(50)  NOT NULL,
    created_at            DATETIME     NOT NULL,
    created_by            VARCHAR(50)  NOT NULL,
    last_modified_at      DATETIME     NOT NULL,
    last_modified_by      VARCHAR(50)  NOT NULL,
    version               INTEGER,
    PRIMARY KEY (analysis_report_id),
    KEY idx_challenge_id (challenge_id),
    KEY idx_status (status),
    KEY idx_tenant_id (tenant_id),
    KEY idx_user_id (user_id),
    KEY idx_created_at (created_at),
    KEY idx_created_by (created_by),
    KEY idx_last_modified_at (last_modified_at),
    KEY idx_last_modified_by (last_modified_by)
);