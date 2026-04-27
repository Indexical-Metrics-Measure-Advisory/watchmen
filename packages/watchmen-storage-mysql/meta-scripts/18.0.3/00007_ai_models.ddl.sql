DROP TABLE IF EXISTS ai_models;

CREATE TABLE ai_models (
    model_id VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    enabled BOOLEAN,
    provider VARCHAR(50),
    api_base VARCHAR(500),
    api_key VARCHAR(500),
    api_version VARCHAR(50),
    model_name VARCHAR(100),
    custom_llm_provider VARCHAR(50),
    timeout DECIMAL(10, 2),
    temperature DECIMAL(5, 4),
    top_p DECIMAL(5, 4),
    max_tokens INT,
    safe_mode BOOLEAN DEFAULT FALSE,
    drop_params BOOLEAN DEFAULT FALSE,
    telemetry BOOLEAN DEFAULT TRUE,
    generation_url VARCHAR(500),
    model_token VARCHAR(500),
    tenant_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(50),
    version INT DEFAULT 0,
    PRIMARY KEY (model_id)
);

CREATE INDEX idx_ai_models_tenant ON ai_models(tenant_id);
CREATE INDEX idx_ai_models_name ON ai_models(name);
