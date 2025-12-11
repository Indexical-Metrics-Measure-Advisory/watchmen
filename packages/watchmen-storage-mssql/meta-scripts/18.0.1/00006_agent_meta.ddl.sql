CREATE TABLE agent_cards
(
    id                    VARCHAR(50)  NOT NULL,
    name                  VARCHAR(255) NOT NULL,
    description           VARCHAR(1000) NOT NULL,
    role                  VARCHAR(50)  NOT NULL,
    capabilities          NVARCHAR(MAX),
    supported_content_types NVARCHAR(MAX),
    metadata              NVARCHAR(MAX),
    is_connecting          BIT      NOT NULL DEFAULT 0,
    user_id               VARCHAR(50)  NOT NULL,
    tenant_id             VARCHAR(50)  NOT NULL,
    created_at            DATETIME2    NOT NULL,
    created_by            VARCHAR(50)  NOT NULL,
    last_modified_at      DATETIME2   NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    version         INT,
    PRIMARY KEY (id)
);

CREATE INDEX idx_agent_cards_tenant_id ON agent_cards (tenant_id);
CREATE INDEX idx_agent_cards_created_at ON agent_cards (created_at);
CREATE INDEX idx_agent_cards_created_by ON agent_cards (created_by);
CREATE INDEX idx_agent_cards_last_modified_at ON agent_cards (last_modified_at);
CREATE INDEX idx_agent_cards_last_modified_by ON agent_cards (last_modified_by);