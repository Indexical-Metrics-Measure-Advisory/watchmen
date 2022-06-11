CREATE TABLE objective_analysis
(
    analysis_id      VARCHAR(50) NOT NULL,
    title            VARCHAR(100),
    perspectives     JSON,
    description      VARCHAR(1024),
    user_id          VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    last_visit_time  DATE        NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    CONSTRAINT pk_objective_analysis PRIMARY KEY (analysis_id)
);
CREATE INDEX i_objective_analysis_1 ON objective_analysis (title);
CREATE INDEX i_objective_analysis_2 ON objective_analysis (user_id);
CREATE INDEX i_objective_analysis_3 ON objective_analysis (tenant_id);
CREATE INDEX i_objective_analysis_4 ON objective_analysis (created_at);
CREATE INDEX i_objective_analysis_5 ON objective_analysis (created_by);
CREATE INDEX i_objective_analysis_6 ON objective_analysis (last_modified_at);
CREATE INDEX i_objective_analysis_7 ON objective_analysis (last_modified_by);
