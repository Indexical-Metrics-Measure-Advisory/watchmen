ALTER TABLE collector_module_config DROP INDEX unique_name;
ALTER TABLE collector_module_config ADD UNIQUE INDEX u_collector_module_config_1 (module_name, tenant_id);