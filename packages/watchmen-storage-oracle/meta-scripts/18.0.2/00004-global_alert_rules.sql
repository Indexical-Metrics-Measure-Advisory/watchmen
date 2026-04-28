CREATE TABLE global_alert_rules
(
    id                VARCHAR2(50)   NOT NULL,
    name              VARCHAR2(128),
    enabled           NUMBER(1),
    priority          VARCHAR2(20),
    description       VARCHAR2(1024),
    condition_logic   VARCHAR2(10),
    conditions        CLOB,
    actions           CLOB,
    next_action       CLOB,
    decision          VARCHAR2(1024),
    tenant_id         VARCHAR2(50)   NOT NULL,
    created_at        DATE           NOT NULL,
    created_by        VARCHAR2(50)   NOT NULL,
    last_modified_at  DATE           NOT NULL,
    last_modified_by  VARCHAR2(50)   NOT NULL,
    version           NUMBER(20)     NOT NULL,
    user_id           VARCHAR2(50)   NOT NULL,
    CONSTRAINT pk_global_alert_rules PRIMARY KEY (id)
);
CREATE INDEX i_global_alert_rules_1 ON global_alert_rules (tenant_id);
CREATE INDEX i_global_alert_rules_2 ON global_alert_rules (created_at);
CREATE INDEX i_global_alert_rules_3 ON global_alert_rules (created_by);
CREATE INDEX i_global_alert_rules_4 ON global_alert_rules (last_modified_at);
CREATE INDEX i_global_alert_rules_5 ON global_alert_rules (last_modified_by);
CREATE INDEX i_global_alert_rules_6 ON global_alert_rules (user_id);
