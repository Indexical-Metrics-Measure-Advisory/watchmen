CREATE TABLE analysis
(
    id                      VARCHAR(50)  NOT NULL,
    analysis_id            VARCHAR(50),
    hypothesis_id            VARCHAR(50),
    hypotheses             NVARCHAR(MAX),
    analysis_metric        NVARCHAR(MAX),
    test_results           NVARCHAR(MAX),
    metrics_card_data      NVARCHAR(MAX),
    customer_characteristics NVARCHAR(MAX),
    purchase_behaviors     NVARCHAR(MAX),
    insight               NVARCHAR(MAX),
    user_id               VARCHAR(50)  NOT NULL,
    tenant_id             VARCHAR(50)  NOT NULL,
    created_at            DATETIME2    NOT NULL,
    created_by            VARCHAR(50) NOT NULL,
    last_modified_at      DATETIME2    NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    version               INT     NOT NULL,
    CONSTRAINT pk_analysis PRIMARY KEY (id)
);

CREATE INDEX ix_analysis_tenant_id ON analysis (tenant_id);
CREATE INDEX ix_analysis_created_at ON analysis (created_at);
CREATE INDEX ix_analysis_created_by ON analysis (created_by);
CREATE INDEX ix_analysis_last_modified_at ON analysis (last_modified_at);
CREATE INDEX ix_analysis_last_modified_by ON analysis (last_modified_by);
CREATE INDEX ix_analysis_analysis_id ON analysis (analysis_id);