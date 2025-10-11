CREATE TABLE agent_cards
(
    id                    VARCHAR2(50)  NOT NULL,
    name                  VARCHAR2(255) NOT NULL,
    description           VARCHAR2(1000) NOT NULL,
    role                  VARCHAR2(50)  NOT NULL,
    capabilities          CLOB,
    supportedContentTypes CLOB,
    metadata              CLOB,
    isConnecting          NUMBER(1)      NOT NULL DEFAULT 0,
    user_id               VARCHAR2(50)  NOT NULL,
    tenant_id             VARCHAR2(50)  NOT NULL,
    created_at            TIMESTAMP    NOT NULL,
    created_by            VARCHAR2(50)  NOT NULL,
    last_modified_at      TIMESTAMP   NOT NULL,
    last_modified_by      VARCHAR2(50) NOT NULL,
    version         NUMBER(10),
    CONSTRAINT pk_agent_cards PRIMARY KEY (id)
);

CREATE INDEX idx_agent_cards_tenant_id ON agent_cards (tenant_id);
CREATE INDEX idx_agent_cards_created_at ON agent_cards (created_at);
CREATE INDEX idx_agent_cards_created_by ON agent_cards (created_by);
CREATE INDEX idx_agent_cards_last_modified_at ON agent_cards (last_modified_at);
CREATE INDEX idx_agent_cards_last_modified_by ON agent_cards (last_modified_by);