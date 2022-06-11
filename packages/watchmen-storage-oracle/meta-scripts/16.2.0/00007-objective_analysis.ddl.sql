CREATE TABLE objective_analysis
(
    analysis_id      VARCHAR2(50) NOT NULL,
    title            VARCHAR2(100),
    perspectives     CLOB,
    description      VARCHAR2(1024),
    user_id          VARCHAR2(50) NOT NULL,
    tenant_id        VARCHAR2(50) NOT NULL,
    last_visit_time  DATE         NOT NULL,
    created_at       TIMESTAMP    NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at TIMESTAMP    NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_objective_analysis PRIMARY KEY (analysis_id)
);
CREATE INDEX i_objective_analysis_1 ON objective_analysis (title);
CREATE INDEX i_objective_analysis_2 ON objective_analysis (user_id);
CREATE INDEX i_objective_analysis_3 ON objective_analysis (tenant_id);
CREATE INDEX i_objective_analysis_4 ON objective_analysis (created_at);
CREATE INDEX i_objective_analysis_5 ON objective_analysis (created_by);
CREATE INDEX i_objective_analysis_6 ON objective_analysis (last_modified_at);
CREATE INDEX i_objective_analysis_7 ON objective_analysis (last_modified_by);
