DROP INDEX u_collector_module_config_1;
CREATE UNIQUE INDEX u_collector_module_config_1 ON collector_module_config (module_name, tenant_id);