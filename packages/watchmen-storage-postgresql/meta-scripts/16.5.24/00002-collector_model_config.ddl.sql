DROP INDEX u_collector_model_config_1;
CREATE UNIQUE INDEX u_collector_model_config_1 ON collector_model_config (model_name, tenant_id);