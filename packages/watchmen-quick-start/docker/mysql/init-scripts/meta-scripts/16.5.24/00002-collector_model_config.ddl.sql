ALTER TABLE collector_model_config DROP INDEX unique_name;
ALTER TABLE collector_model_config ADD UNIQUE INDEX unique_name (model_name, tenant_id);