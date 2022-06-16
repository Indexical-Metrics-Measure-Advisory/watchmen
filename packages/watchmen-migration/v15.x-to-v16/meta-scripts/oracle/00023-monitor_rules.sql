-- noinspection SqlResolveForFile
ALTER TABLE monitor_rules RENAME TO monitor_rules_1;
ALTER TABLE monitor_rules_1 RENAME TO monitor_rules;
ALTER TABLE monitor_rules RENAME COLUMN ruleid TO rule_id;
ALTER TABLE monitor_rules
    MODIFY rule_id VARCHAR2(50);
ALTER TABLE monitor_rules
    MODIFY code VARCHAR2(50) NOT NULL;
ALTER TABLE monitor_rules
    MODIFY grade VARCHAR2(20) NOT NULL;
ALTER TABLE monitor_rules
    MODIFY severity VARCHAR2(20) NOT NULL;
ALTER TABLE monitor_rules RENAME COLUMN topicid TO topic_id;
ALTER TABLE monitor_rules
    MODIFY topic_id VARCHAR2(50);
ALTER TABLE monitor_rules RENAME COLUMN factorid TO factor_id;
ALTER TABLE monitor_rules
    MODIFY factor_id VARCHAR2(50);
ALTER TABLE monitor_rules RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE monitor_rules
    MODIFY tenant_id VARCHAR2(50) NOT NULL;
ALTER TABLE monitor_rules
    DROP COLUMN createtime;
ALTER TABLE monitor_rules
    DROP COLUMN lastmodified;
ALTER TABLE monitor_rules
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE monitor_rules
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE monitor_rules
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE monitor_rules
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
CREATE INDEX i_monitor_rules_created_at ON monitor_rules (created_at);
CREATE INDEX i_monitor_rules_created_by ON monitor_rules (created_by);
CREATE INDEX i_monitor_rules_last_modified_at ON monitor_rules (last_modified_at);
CREATE INDEX i_monitor_rules_last_modified_by ON monitor_rules (last_modified_by);
CREATE INDEX i_monitor_rules_code ON monitor_rules (code);
CREATE INDEX i_monitor_rules_grade ON monitor_rules (grade);
CREATE INDEX i_monitor_rules_severity ON monitor_rules (severity);
CREATE INDEX i_monitor_rules_factor_id ON monitor_rules (factor_id);
CREATE INDEX i_monitor_rules_topic_id ON monitor_rules (topic_id);
CREATE INDEX i_monitor_rules_tenant_id ON monitor_rules (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE monitor_rules
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1';
