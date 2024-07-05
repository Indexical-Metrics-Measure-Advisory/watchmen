CREATE TABLE ai_models
(
    tenant_id          VARCHAR(50) NOT NULL,
    model_id           VARCHAR(50) NOT NULL,
    enable_monitor     TINYINT(1)  NOT NULL,
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
    created_at         DATETIME    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            BIGINT,
    PRIMARY KEY (tenant_id, model_id),
    INDEX (tenant_id),
    INDEX (model_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)

);
