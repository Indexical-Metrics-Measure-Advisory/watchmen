ALTER TABLE oss_collector_competitive_lock RENAME TO collector_competitive_lock;
ALTER TABLE collector_competitive_lock
ADD tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE collector_competitive_lock
ADD status TINYINT NOT NULL;
ALTER TABLE collector_competitive_lock
DROP INDEX unique_resource;
ALTER TABLE collector_competitive_lock
ADD CONSTRAINT unique_resource UNIQUE (resource_id);