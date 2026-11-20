ALTER TABLE task_definitions
  ADD COLUMN external_trigger JSONB,
  ADD COLUMN callback JSONB;
