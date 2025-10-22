EXEC sp_rename N'oss_collector_competitive_lock', N'collector_competitive_lock', 'OBJECT';
ALTER TABLE collector_competitive_lock
ADD tenant_id NVARCHAR(50) NOT NULL;
ALTER TABLE collector_competitive_lock
ADD status DECIMAL(1) NOT NULL;
DROP INDEX u_oss_collector_competitive_lock_1 ON collector_competitive_lock;
ALTER TABLE collector_competitive_lock
ADD CONSTRAINT unique_resource UNIQUE (resource_id);