CREATE TABLE scheduled_task
(
    task_id             NUMBER(20)      NOT NULL,
    resource_id         VARCHAR2(50)    NOT NULL,
    topic_code          VARCHAR2(50)    NOT NULL,
    content             CLOB,
    model_name          VARCHAR2(50)    NOT NULL,
    object_id           VARCHAR2(50)    NOT NULL,
    depend_on           CLOB,
    parent_task_id      CLOB,
	is_finished         NUMBER(1)       NOT NULL,
	result              CLOB,
    tenant_id           VARCHAR2(50)    NOT NULL,
    created_at          DATE            NOT NULL,
    created_by          VARCHAR2(50)    NOT NULL,
    last_modified_at    DATE            NOT NULL,
    last_modified_by    VARCHAR2(50)    NOT NULL,
    CONSTRAINT pk_scheduled_task PRIMARY KEY (task_id)
);
CREATE UNIQUE INDEX u_scheduled_task_1 ON scheduled_task (resource_id);
CREATE INDEX i_scheduled_task_1 ON scheduled_task (tenant_id);
CREATE INDEX i_scheduled_task_2 ON scheduled_task (created_at);
CREATE INDEX i_scheduled_task_3 ON scheduled_task (created_by);
CREATE INDEX i_scheduled_task_4 ON scheduled_task (last_modified_at);
CREATE INDEX i_scheduled_task_5 ON scheduled_task (last_modified_by);
CREATE INDEX i_scheduled_task_6 ON scheduled_task (object_id, model_name);
