-- noinspection SqlResolveForFile
RENAME TABLE factor_index TO factor_index_1;
RENAME TABLE factor_index_1 TO factor_index;
ALTER TABLE factor_index
    CHANGE factorindexid factor_index_id VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    CHANGE factorid factor_id VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    CHANGE type factor_type VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    CHANGE name factor_name VARCHAR(255) NOT NULL;
ALTER TABLE factor_index
    CHANGE label factor_label VARCHAR(255) NULL;
ALTER TABLE factor_index
    CHANGE description factor_description VARCHAR(1024) NULL;
ALTER TABLE factor_index
    CHANGE topicid topic_id VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    CHANGE topicname topic_name VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE factor_index
    DROP createtime;
ALTER TABLE factor_index
    DROP lastmodified;
ALTER TABLE factor_index
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE factor_index
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX created_at ON factor_index (created_at);
CREATE INDEX last_modified_at ON factor_index (last_modified_at);
CREATE INDEX factor_id ON factor_index (factor_id);
CREATE INDEX factor_name ON factor_index (factor_name);
CREATE INDEX tenant_id ON factor_index (tenant_id);
CREATE INDEX topic_id ON factor_index (topic_id);
CREATE INDEX topic_name ON factor_index (topic_name);
-- noinspection SqlWithoutWhere
UPDATE factor_index
SET created_at       = NOW(),
    last_modified_at = NOW();
