CREATE TABLE achievement_plugin_tasks
(
    achievement_task_id VARCHAR(50) NOT NULL,
    achievement_id      VARCHAR(50) NOT NULL,
    plugin_id           VARCHAR(50) NOT NULL,
    status              VARCHAR(10) NOT NULL,
    url                 VARCHAR(512),
    user_id             VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP   NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_achievement_plugin_tasks PRIMARY KEY (achievement_task_id)
);
CREATE INDEX i_achievement_plugin_tasks_1 ON achievement_plugin_tasks (achievement_id);
CREATE INDEX i_achievement_plugin_tasks_2 ON achievement_plugin_tasks (plugin_id);
CREATE INDEX i_achievement_plugin_tasks_3 ON achievement_plugin_tasks (status);
CREATE INDEX i_achievement_plugin_tasks_4 ON achievement_plugin_tasks (user_id);
CREATE INDEX i_achievement_plugin_tasks_5 ON achievement_plugin_tasks (tenant_id);
CREATE INDEX i_achievement_plugin_tasks_6 ON achievement_plugin_tasks (created_at);
CREATE INDEX i_achievement_plugin_tasks_7 ON achievement_plugin_tasks (created_by);
CREATE INDEX i_achievement_plugin_tasks_8 ON achievement_plugin_tasks (last_modified_at);
CREATE INDEX i_achievement_plugin_tasks_9 ON achievement_plugin_tasks (last_modified_by);
