-- noinspection SqlResolveForFile
RENAME TABLE topics TO topics_1;
RENAME TABLE topics_1 TO topics;
ALTER TABLE topics
    CHANGE topicid topic_id VARCHAR(50) NOT NULL;
ALTER TABLE topics
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE topics
    MODIFY type VARCHAR(20) NOT NULL;
ALTER TABLE topics
    MODIFY kind VARCHAR(20) NOT NULL;
ALTER TABLE topics
    CHANGE datasourceid data_source_id VARCHAR(50) NULL;
ALTER TABLE topics
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE topics
    DROP createtime;
ALTER TABLE topics
    DROP lastmodified;
ALTER TABLE topics
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE topics
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE topics
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE topics
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE topics
    ADD version BIGINT NULL;
CREATE INDEX created_at ON topics (created_at);
CREATE INDEX created_by ON topics (created_by);
CREATE INDEX last_modified_at ON topics (last_modified_at);
CREATE INDEX last_modified_by ON topics (last_modified_by);
CREATE INDEX data_source_id ON topics (data_source_id);
CREATE INDEX kind ON topics (kind);
CREATE INDEX type ON topics (type);
CREATE INDEX name ON topics (name);
CREATE INDEX tenant_id ON topics (tenant_id);
CREATE UNIQUE INDEX name_tenant_id ON topics (name, tenant_id);
-- noinspection SqlWithoutWhere
UPDATE topics
set created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
