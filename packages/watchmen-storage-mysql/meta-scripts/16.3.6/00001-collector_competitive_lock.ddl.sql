ALTER TABLE oss_collector_competitive_lock RENAME collector_competitive_lock;
ALTER TABLE collector_competitive_lock
ADD tenant_id VARCHAR(50) NOT NULL;
