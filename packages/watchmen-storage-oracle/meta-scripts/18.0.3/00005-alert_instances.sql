CREATE TABLE alert_instances
(
    instance_id          VARCHAR2(50)   NOT NULL,
    rule_id              VARCHAR2(50),
    rule_name            VARCHAR2(128),
    trigger_time         DATE,
    severity             VARCHAR2(20),
    message              VARCHAR2(1024),
    condition_results    CLOB,
    actions              CLOB,
    acknowledged         NUMBER(1),
    acknowledged_by      VARCHAR2(50),
    acknowledged_at      DATE,
    acknowledge_reason   VARCHAR2(1024),
    next_trigger_time    DATE,
    interval_minutes     NUMBER(10),
    tenant_id            VARCHAR2(50)   NOT NULL,
    created_at           DATE          NOT NULL,
    created_by           VARCHAR2(50)  NOT NULL,
    last_modified_at     DATE          NOT NULL,
    last_modified_by    VARCHAR2(50)  NOT NULL,
    version              NUMBER(20)    NOT NULL,
    user_id              VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_alert_instances PRIMARY KEY (instance_id)
);
CREATE INDEX i_alert_instances_1 ON alert_instances (tenant_id);
CREATE INDEX i_alert_instances_2 ON alert_instances (rule_id);
CREATE INDEX i_alert_instances_3 ON alert_instances (trigger_time);
CREATE INDEX i_alert_instances_4 ON alert_instances (acknowledged);
CREATE INDEX i_alert_instances_5 ON alert_instances (created_at);
CREATE INDEX i_alert_instances_6 ON alert_instances (created_by);
CREATE INDEX i_alert_instances_7 ON alert_instances (last_modified_at);
CREATE INDEX i_alert_instances_8 ON alert_instances (last_modified_by);
CREATE INDEX i_alert_instances_9 ON alert_instances (user_id);