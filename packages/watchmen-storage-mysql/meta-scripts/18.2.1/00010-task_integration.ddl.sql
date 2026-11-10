ALTER TABLE task_definitions
  ADD COLUMN external_trigger JSON,
  ADD COLUMN callback JSON;
