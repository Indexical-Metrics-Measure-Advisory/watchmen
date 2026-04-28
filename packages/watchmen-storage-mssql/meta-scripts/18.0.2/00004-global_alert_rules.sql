CREATE TABLE global_alert_rules
(
    id                NVARCHAR(50)   NOT NULL,
    name              NVARCHAR(128),
    enabled           SMALLINT,
    priority          NVARCHAR(20),
    description       NVARCHAR(1024),
    condition_logic   NVARCHAR(10),
    conditions        NVARCHAR(MAX),
    actions           NVARCHAR(MAX),
    next_action       NVARCHAR(MAX),
    decision          NVARCHAR(1024),
    tenant_id         NVARCHAR(50)   NOT NULL,
    created_at        DATETIME       NOT NULL,
    created_by        NVARCHAR(50)   NOT NULL,
    last_modified_at  DATETIME       NOT NULL,
    last_modified_by  NVARCHAR(50)   NOT NULL,
    version           INTEGER        NOT NULL,
    user_id           NVARCHAR(50)   NOT NULL,
    CONSTRAINT pk_global_alert_rules PRIMARY KEY (id)
);
CREATE INDEX i_global_alert_rules_1 ON global_alert_rules (tenant_id);
CREATE INDEX i_global_alert_rules_2 ON global_alert_rules (created_at);
CREATE INDEX i_global_alert_rules_3 ON global_alert_rules (created_by);
CREATE INDEX i_global_alert_rules_4 ON global_alert_rules (last_modified_at);
CREATE INDEX i_global_alert_rules_5 ON global_alert_rules (last_modified_by);
CREATE INDEX i_global_alert_rules_6 ON global_alert_rules (user_id);
