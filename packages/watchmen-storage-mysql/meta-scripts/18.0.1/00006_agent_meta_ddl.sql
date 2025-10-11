CREATE TABLE agent_cards
(
    id                    VARCHAR(50)  NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    description           VARCHAR(1000) NOT NULL,
    role                  VARCHAR(50)  NOT NULL,
    capabilities          JSON,
    supportedContentTypes JSON,
    metadata              JSON,
    isConnecting          BOOLEAN      NOT NULL DEFAULT FALSE,
    user_id               VARCHAR(50)  NOT NULL,
    tenant_id             VARCHAR(50)  NOT NULL,
    created_at            DATETIME    NOT NULL,
    created_by            VARCHAR(50)  NOT NULL,
    last_modified_at      DATETIME   NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    version         INTEGER,
    PRIMARY KEY (id),
    KEY idx_tenant_id (tenant_id),
    KEY idx_created_at (created_at),
    KEY idx_created_by (created_by),
    KEY idx_last_modified_at (last_modified_at),
    KEY idx_last_modified_by (last_modified_by)
);