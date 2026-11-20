CREATE TABLE task_definitions (
  task_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL, name VARCHAR2(255) NOT NULL,
  description CLOB, task_type VARCHAR2(50) NOT NULL, execution_mode VARCHAR2(32) NOT NULL,
  engine_kind VARCHAR2(128) NOT NULL, engine_id VARCHAR2(255) NOT NULL, engine_ref CLOB, schedule CLOB,
  enabled NUMBER(1) NOT NULL, owner_id VARCHAR2(50), tags CLOB, params CLOB,
  dependency_wait_timeout_minutes NUMBER(10) NOT NULL, freshness_sla_minutes NUMBER(10), synced_at TIMESTAMP, last_run_summary CLOB,
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50), version NUMBER(10) NOT NULL,
  CONSTRAINT uk_task_engine UNIQUE (tenant_id, engine_kind, engine_id)
);
CREATE INDEX idx_task_type ON task_definitions (tenant_id, task_type);
