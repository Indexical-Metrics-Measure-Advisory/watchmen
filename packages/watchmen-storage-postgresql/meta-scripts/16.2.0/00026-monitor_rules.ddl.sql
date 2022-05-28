CREATE TABLE monitor_rules
(
    rule_id          VARCHAR(50) NOT NULL,
    code             VARCHAR(50) NOT NULL,
    grade            VARCHAR(20) NOT NULL,
    severity         VARCHAR(20) NOT NULL,
    topic_id         VARCHAR(50),
    factor_id        VARCHAR(50),
    params           JSON,
    enabled          SMALLINT,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    CONSTRAINT pk_monitor_rules PRIMARY KEY (rule_id)
);
CREATE INDEX i_monitor_rules_1 ON monitor_rules (code);
CREATE INDEX i_monitor_rules_2 ON monitor_rules (grade);
CREATE INDEX i_monitor_rules_3 ON monitor_rules (severity);
CREATE INDEX i_monitor_rules_4 ON monitor_rules (topic_id);
CREATE INDEX i_monitor_rules_5 ON monitor_rules (factor_id);
CREATE INDEX i_monitor_rules_6 ON monitor_rules (tenant_id);
CREATE INDEX i_monitor_rules_7 ON monitor_rules (created_at);
CREATE INDEX i_monitor_rules_8 ON monitor_rules (created_by);
CREATE INDEX i_monitor_rules_9 ON monitor_rules (last_modified_at);
CREATE INDEX i_monitor_rules_10 ON monitor_rules (last_modified_by);
