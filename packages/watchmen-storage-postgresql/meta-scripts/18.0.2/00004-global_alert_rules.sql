CREATE TABLE global_alert_rules
(
    id                VARCHAR(50)   NOT NULL,
    name              VARCHAR(128),
    enabled           SMALLINT,
    priority          VARCHAR(20),
    description       VARCHAR(1024),
    condition_logic   VARCHAR(10),
    conditions        JSON,
    actions           JSON,
    next_action       JSON,
    decision          VARCHAR(1024),
    tenant_id         VARCHAR(50)   NOT NULL,
    created_at        TIMESTAMP     NOT NULL,
    created_by        VARCHAR(50)   NOT NULL,
    last_modified_at  TIMESTAMP     NOT NULL,
    last_modified_by  VARCHAR(50)   NOT NULL,
    version           INTEGER       NOT NULL,
    user_id           VARCHAR(50)   NOT NULL,
    CONSTRAINT pk_global_alert_rules PRIMARY KEY (id)
);
CREATE INDEX i_global_alert_rules_1 ON global_alert_rules (tenant_id);
CREATE INDEX i_global_alert_rules_2 ON global_alert_rules (created_at);
CREATE INDEX i_global_alert_rules_3 ON global_alert_rules (created_by);
CREATE INDEX i_global_alert_rules_4 ON global_alert_rules (last_modified_at);
CREATE INDEX i_global_alert_rules_5 ON global_alert_rules (last_modified_by);
CREATE INDEX i_global_alert_rules_6 ON global_alert_rules (user_id);
