CREATE TABLE ai_models
(
    tenant_id          VARCHAR(50) NOT NULL,
    model_id           VARCHAR(50) NOT NULL,
    enable_monitor     DECIMAL(1)  NOT NULL,
    llm_provider       VARCHAR(20) NOT NULL,
    base_url           VARCHAR(100),
    model_name         VARCHAR(50),
    model_version      VARCHAR(50),
    model_token        VARCHAR(255),
    embedding_provider VARCHAR(20) NOT NULL,
    base_embedding_url VARCHAR(100),
    embedding_name     VARCHAR(50),
    embedding_version  VARCHAR(50),
    embedding_token    VARCHAR(255),
    created_at         TIMESTAMP    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            BIGINT,
    CONSTRAINT pk_ai_models PRIMARY KEY (model_id,tenant_id)
--     INDEX (tenant_id),
--     INDEX (model_id),
--     INDEX (created_at),
--     INDEX (created_by),
--     INDEX (last_modified_at),
--     INDEX (last_modified_by)

);

CREATE INDEX i_ai_models_1 ON ai_models (tenant_id);
CREATE INDEX i_ai_models_2 ON ai_models (model_id);
CREATE INDEX i_ai_models_4 ON ai_models (created_at);
CREATE INDEX i_ai_models_5 ON ai_models (created_by);
CREATE INDEX i_ai_models_6 ON ai_models (last_modified_at);
CREATE INDEX i_ai_models_7 ON ai_models (last_modified_by);



