-- noinspection SqlResolveForFile
RENAME TABLE monitor_rules TO monitor_rules_1;
RENAME TABLE monitor_rules_1 TO monitor_rules;
ALTER TABLE monitor_rules
    CHANGE ruleid rule_id VARCHAR(50) NOT NULL;
ALTER TABLE monitor_rules
    MODIFY code VARCHAR(50) NOT NULL;
ALTER TABLE monitor_rules
    MODIFY grade VARCHAR(20) NOT NULL;
ALTER TABLE monitor_rules
    MODIFY severity VARCHAR(20) NOT NULL;
ALTER TABLE monitor_rules
    CHANGE topicid topic_id VARCHAR(50) NULL;
ALTER TABLE monitor_rules
    CHANGE factorid factor_id VARCHAR(50) NULL;
ALTER TABLE monitor_rules
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE monitor_rules
    DROP createtime;
ALTER TABLE monitor_rules
    DROP lastmodified;
ALTER TABLE monitor_rules
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE monitor_rules
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE monitor_rules
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE monitor_rules
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
CREATE INDEX created_at ON monitor_rules (created_at);
CREATE INDEX created_by ON monitor_rules (created_by);
CREATE INDEX last_modified_at ON monitor_rules (last_modified_at);
CREATE INDEX last_modified_by ON monitor_rules (last_modified_by);
CREATE INDEX code ON monitor_rules (code);
CREATE INDEX grade ON monitor_rules (grade);
CREATE INDEX severity ON monitor_rules (severity);
CREATE INDEX factor_id ON monitor_rules (factor_id);
CREATE INDEX topic_id ON monitor_rules (topic_id);
CREATE INDEX tenant_id ON monitor_rules (tenant_id);
-- noinspection SqlWithoutWhere
UPDATE monitor_rules
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1';
