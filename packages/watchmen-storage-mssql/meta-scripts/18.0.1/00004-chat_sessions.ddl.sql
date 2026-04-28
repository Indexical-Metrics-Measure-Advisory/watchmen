CREATE TABLE chat_sessions
(
    id               VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    messages         NVARCHAR(MAX),
    created_at   DATETIME2    NOT NULL,
    created_by   VARCHAR(50) NOT NULL,
    analysis_type    VARCHAR(50),
    user_id          VARCHAR(50)  NOT NULL,
    tenant_id        VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME2     NOT NULL,
    last_modified_by VARCHAR(50)  NOT NULL,
    version          INT,
    PRIMARY KEY (id)
);

CREATE INDEX idx_chat_sessions_user_tenant ON chat_sessions (user_id, tenant_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions (created_at);
CREATE INDEX idx_chat_sessions_created_by ON chat_sessions (created_by);
CREATE INDEX idx_chat_sessions_analysis_type ON chat_sessions (analysis_type);