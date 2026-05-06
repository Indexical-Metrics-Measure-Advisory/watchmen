CREATE TABLE alert_instances
(
    instance_id          VARCHAR(50)   NOT NULL,
    rule_id              VARCHAR(50),
    rule_name            VARCHAR(128),
    trigger_time         TIMESTAMP,
    severity             VARCHAR(20),
    message              VARCHAR(1024),
    condition_results    JSON,
    actions              JSON,
    acknowledged         SMALLINT,
    acknowledged_by      VARCHAR(50),
    acknowledged_at      TIMESTAMP,
    acknowledge_reason   VARCHAR(1024),
    next_trigger_time    TIMESTAMP,
    interval_minutes     INTEGER,
    tenant_id            VARCHAR(50)   NOT NULL,
    created_at           TIMESTAMP     NOT NULL,
    created_by           VARCHAR(50)   NOT NULL,
    last_modified_at     TIMESTAMP     NOT NULL,
    last_modified_by     VARCHAR(50)   NOT NULL,
    version              INTEGER       NOT NULL,
    user_id              VARCHAR(50)   NOT NULL,
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