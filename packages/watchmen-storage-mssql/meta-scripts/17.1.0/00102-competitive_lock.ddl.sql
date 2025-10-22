ALTER TABLE competitive_lock DROP CONSTRAINT pk_competitive_lock;
ALTER TABLE competitive_lock ALTER COLUMN lock_id BIGINT NOT NULL;
ALTER TABLE competitive_lock ADD CONSTRAINT pk_competitive_lock PRIMARY KEY (lock_id);