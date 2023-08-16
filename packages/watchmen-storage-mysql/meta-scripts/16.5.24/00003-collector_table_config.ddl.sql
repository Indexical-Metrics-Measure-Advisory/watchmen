ALTER TABLE collector_table_config DROP INDEX unique_name;
ALTER TABLE collector_table_config ADD UNIQUE INDEX unique_name (name, tenant_id);
ALTER TABLE collector_table_config ADD UNIQUE INDEX unique_table_name (table_name, tenant_id);