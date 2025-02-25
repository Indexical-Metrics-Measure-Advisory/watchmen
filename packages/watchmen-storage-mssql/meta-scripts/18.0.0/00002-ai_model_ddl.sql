CREATE TABLE ai_models
(
    model_id           NVARCHAR(50) NOT NULL,
    enable_monitor     TINYINT(1)  NOT NULL,
    llm_provider       NVARCHAR(20) NOT NULL,
    base_url           NVARCHAR(100),
    model_name         NVARCHAR(50),
    model_version      NVARCHAR(50),
    model_token        NVARCHAR(255),
    embedding_provider NVARCHAR(20) NOT NULL,
    base_embedding_url NVARCHAR(100),
    embedding_name     NVARCHAR(50),
    embedding_version  NVARCHAR(50),
    embedding_token    NVARCHAR(255),
    tenant_id          NVARCHAR(50) NOT NULL,
    created_at         DATETIME    NOT NULL,
    created_by         NVARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   NVARCHAR(50) NOT NULL,
    version            INTEGER,
    CONSTRAINT pk_ai_models PRIMARY KEY (model_id)
);
CREATE INDEX i_ai_models_1 ON ai_models (tenant_id);
CREATE INDEX i_ai_models_2 ON ai_models (created_at);
CREATE INDEX i_ai_models_3 ON ai_models (created_by);
CREATE INDEX i_ai_models_4 ON ai_models (last_modified_at);
CREATE INDEX i_ai_models_5 ON ai_models (last_modified_by);
