-- noinspection SqlResolveForFile
ALTER TABLE factor_index RENAME TO factor_index_1;
ALTER TABLE factor_index_1 RENAME TO factor_index;
ALTER TABLE factor_index RENAME COLUMN factorindexid TO factor_index_id;
ALTER TABLE factor_index
    MODIFY factor_index_id VARCHAR2(50);
ALTER TABLE factor_index RENAME COLUMN factorid TO factor_id;
ALTER TABLE factor_index
    MODIFY factor_id VARCHAR2(50);
ALTER TABLE factor_index RENAME COLUMN type TO factor_type;
ALTER TABLE factor_index
    MODIFY factor_type VARCHAR2(50);
ALTER TABLE factor_index RENAME COLUMN name TO factor_name;
ALTER TABLE factor_index
    MODIFY factor_name VARCHAR2(255);
ALTER TABLE factor_index RENAME COLUMN label TO factor_label;
ALTER TABLE factor_index
    MODIFY factor_label VARCHAR2(255);
ALTER TABLE factor_index RENAME COLUMN description TO factor_description;
ALTER TABLE factor_index
    MODIFY factor_description VARCHAR2(1024);
ALTER TABLE factor_index RENAME COLUMN topicid TO topic_id;
ALTER TABLE factor_index
    MODIFY topic_id VARCHAR2(50);
ALTER TABLE factor_index RENAME COLUMN topicname TO topic_name;
ALTER TABLE factor_index
    MODIFY topic_name VARCHAR2(50);
ALTER TABLE factor_index RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE factor_index
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE factor_index
    DROP COLUMN createtime;
ALTER TABLE factor_index
    DROP COLUMN lastmodified;
ALTER TABLE factor_index
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE factor_index
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_factor_index_created_at ON factor_index (created_at);
CREATE INDEX i_factor_index_last_modified_at ON factor_index (last_modified_at);
CREATE INDEX i_factor_index_factor_id ON factor_index (factor_id);
CREATE INDEX i_factor_index_factor_name ON factor_index (factor_name);
CREATE INDEX i_factor_index_tenant_id ON factor_index (tenant_id);
CREATE INDEX i_factor_index_topic_id ON factor_index (topic_id);
CREATE INDEX i_factor_index_topic_name ON factor_index (topic_name);
-- noinspection SqlWithoutWhere
UPDATE factor_index
SET created_at       = SYSDATE,
    last_modified_at = SYSDATE;
