DROP INDEX collector_table_config.u_collector_table_config_1 ON collector_table_config;
CREATE UNIQUE INDEX u_collector_table_config_1 ON collector_table_config (name, tenant_id);
CREATE UNIQUE INDEX u_collector_table_config_2 ON collector_table_config (table_name, tenant_id);