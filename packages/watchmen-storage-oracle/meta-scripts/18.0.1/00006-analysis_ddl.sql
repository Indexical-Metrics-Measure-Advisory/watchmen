CREATE TABLE analysis
(
    id                     VARCHAR2(50)  NOT NULL,
    analysis_id            VARCHAR2(50),
    hypothesis_id          VARCHAR2(50),
    hypotheses             CLOB,
    analysis_metric        CLOB,
    test_results           CLOB,
    metrics_card_data      CLOB,
    customer_characteristics CLOB,
    purchase_behaviors    CLOB,
    insight               CLOB,
    user_id               VARCHAR2(50)  NOT NULL,
    tenant_id             VARCHAR2(50)  NOT NULL,
    created_at            DATE    NOT NULL,
    created_by            VARCHAR2(50) NOT NULL,
    last_modified_at      DATE    NOT NULL,
    last_modified_by      VARCHAR2(50) NOT NULL,
    version               NUMBER(10)     NOT NULL,
    CONSTRAINT pk_analysis PRIMARY KEY (id)
);

CREATE INDEX ix_analysis_tenant_id ON analysis (tenant_id);
CREATE INDEX ix_analysis_created_at ON analysis (created_at);
CREATE INDEX ix_analysis_created_by ON analysis (created_by);
CREATE INDEX ix_analysis_last_modified_at ON analysis (last_modified_at);
CREATE INDEX ix_analysis_last_modified_by ON analysis (last_modified_by);
CREATE INDEX ix_analysis_analysis_id ON analysis (analysis_id);