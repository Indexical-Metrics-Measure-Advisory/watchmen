DROP TABLE ai_models PURGE;

CREATE TABLE ai_models (
    model_id VARCHAR2(50) NOT NULL,
    name VARCHAR2(100),
    enabled NUMBER(1, 0) DEFAULT 0,
    provider VARCHAR2(50),
    api_base VARCHAR2(500),
    api_key VARCHAR2(500),
    api_version VARCHAR2(50),
    model_name VARCHAR2(100),
    custom_llm_provider VARCHAR2(50),
    timeout NUMBER(10, 2),
    temperature NUMBER(5, 4),
    top_p NUMBER(5, 4),
    max_tokens INTEGER,
    safe_mode NUMBER(1, 0) DEFAULT 0,
    drop_params NUMBER(1, 0) DEFAULT 0,
    telemetry NUMBER(1, 0) DEFAULT 1,
    generation_url VARCHAR2(500),
    model_token VARCHAR2(500),
    tenant_id VARCHAR2(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR2(50),
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR2(50),
    version INTEGER DEFAULT 0,
    PRIMARY KEY (model_id)
);

CREATE INDEX idx_ai_models_tenant ON ai_models(tenant_id);
CREATE INDEX idx_ai_models_name ON ai_models(name);
