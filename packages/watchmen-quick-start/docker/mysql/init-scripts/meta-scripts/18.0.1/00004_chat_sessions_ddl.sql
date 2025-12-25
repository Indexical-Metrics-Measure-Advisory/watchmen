CREATE TABLE chat_sessions
(
    id               VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    messages         JSON,
    created_at   DATETIME    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    analysis_type    VARCHAR(50),
    user_id          VARCHAR(50)  NOT NULL,
    tenant_id        VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by VARCHAR(50)  NOT NULL,
    version          INTEGER,
    PRIMARY KEY (id),
    KEY idx_user_tenant (user_id, tenant_id),
    KEY idx_created_at (created_at),
    KEY idx_created_by (created_by),
    KEY idx_analysis_type (analysis_type)
);