-- noinspection SqlResolveForFile
ALTER TABLE topics RENAME TO topics_1;
ALTER TABLE topics_1 RENAME TO topics;
ALTER TABLE topics RENAME COLUMN topicid TO topic_id;
ALTER TABLE topics
    MODIFY topic_id VARCHAR2(50);
ALTER TABLE topics
    MODIFY description VARCHAR2(1024);
ALTER TABLE topics
    MODIFY type VARCHAR2(20) NOT NULL;
ALTER TABLE topics
    MODIFY kind VARCHAR2(20) NOT NULL;
ALTER TABLE topics RENAME COLUMN datasourceid TO data_source_id;
ALTER TABLE topics
    MODIFY data_source_id VARCHAR2(50);
ALTER TABLE topics RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE topics
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE topics
    DROP COLUMN createtime;
ALTER TABLE topics
    DROP COLUMN lastmodified;
ALTER TABLE topics
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE topics
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE topics
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE topics
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE topics
    ADD version NUMBER(20) NULL;
CREATE INDEX i_topics_created_at ON topics (created_at);
CREATE INDEX i_topics_created_by ON topics (created_by);
CREATE INDEX i_topics_last_modified_at ON topics (last_modified_at);
CREATE INDEX i_topics_last_modified_by ON topics (last_modified_by);
CREATE INDEX i_topics_data_source_id ON topics (data_source_id);
CREATE INDEX i_topics_kind ON topics (kind);
CREATE INDEX i_topics_type ON topics (type);
CREATE INDEX i_topics_name ON topics (name);
CREATE INDEX i_topics_tenant_id ON topics (tenant_id);
CREATE UNIQUE INDEX u_topics_name_tenant_id ON topics (name, tenant_id);
-- noinspection SqlWithoutWhere
UPDATE topics
set created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
