CREATE TABLE chat_sessions
(
    id               VARCHAR2(50)  NOT NULL,
    title            VARCHAR2(255) NOT NULL,
    messages         CLOB,
    created_at   DATE    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    analysis_type    VARCHAR2(50),
    user_id          VARCHAR2(50)  NOT NULL,
    tenant_id        VARCHAR2(50)  NOT NULL,
    last_modified_at DATE     NOT NULL,
    last_modified_by VARCHAR2(50)  NOT NULL,
    version          NUMBER(10),
    CONSTRAINT pk_chat_sessions PRIMARY KEY (id)
);

CREATE INDEX idx_chat_sessions_user_tenant ON chat_sessions (user_id, tenant_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions (created_at);
CREATE INDEX idx_chat_sessions_created_by ON chat_sessions (created_by);
CREATE INDEX idx_chat_sessions_analysis_type ON chat_sessions (analysis_type);