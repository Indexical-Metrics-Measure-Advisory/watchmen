ALTER TABLE oss_collector_competitive_lock RENAME TO collector_competitive_lock;
ALTER TABLE collector_competitive_lock
ADD tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE collector_competitive_lock
ADD status DECIMAL(1) NOT NULL;
DROP INDEX u_oss_collector_competitive_lock_1;
ALTER TABLE collector_competitive_lock
ADD CONSTRAINT unique_resource UNIQUE (resource_id);