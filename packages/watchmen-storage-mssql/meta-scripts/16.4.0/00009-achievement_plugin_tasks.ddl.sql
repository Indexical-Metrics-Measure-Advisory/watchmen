CREATE TABLE achievement_plugin_tasks
(
    achievement_task_id NVARCHAR(50) NOT NULL,
    achievement_id      NVARCHAR(50) NOT NULL,
    plugin_id           NVARCHAR(50) NOT NULL,
    user_id             NVARCHAR(50) NOT NULL,
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME     NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME     NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_achievement_plugin_tasks PRIMARY KEY (achievement_task_id)
);
CREATE INDEX i_achievement_plugin_tasks_1 ON achievement_plugin_tasks (achievement_id);
CREATE INDEX i_achievement_plugin_tasks_2 ON achievement_plugin_tasks (plugin_id);
CREATE INDEX i_achievement_plugin_tasks_3 ON achievement_plugin_tasks (user_id);
CREATE INDEX i_achievement_plugin_tasks_4 ON achievement_plugin_tasks (tenant_id);
CREATE INDEX i_achievement_plugin_tasks_5 ON achievement_plugin_tasks (created_at);
CREATE INDEX i_achievement_plugin_tasks_6 ON achievement_plugin_tasks (created_by);
CREATE INDEX i_achievement_plugin_tasks_7 ON achievement_plugin_tasks (last_modified_at);
CREATE INDEX i_achievement_plugin_tasks_8 ON achievement_plugin_tasks (last_modified_by);
