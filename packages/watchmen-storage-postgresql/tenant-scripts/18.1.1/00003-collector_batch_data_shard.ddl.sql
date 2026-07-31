CREATE TABLE collector_batch_data_shard (
	shard_id            BIGINT              NOT NULL,
	name                VARCHAR(50)         NOT NULL,
	table_name          VARCHAR(50)         NOT NULL,
	start_id            VARCHAR(50)         NOT NULL,
	end_id              VARCHAR(50)         NOT NULL,
	status              SMALLINT,
	result              JSON,
	type                SMALLINT,
	tenant_id           VARCHAR(50)         NOT NULL,
    created_at          TIMESTAMP           NOT NULL,
    created_by          VARCHAR(50)         NOT NULL,
    last_modified_at    TIMESTAMP           NOT NULL,
    last_modified_by    VARCHAR(50)         NOT NULL,
	CONSTRAINT pk_collector_batch_data_shard PRIMARY KEY (shard_id)
);
CREATE INDEX i_collector_batch_data_shard_1 ON collector_batch_data_shard (tenant_id);
CREATE INDEX i_collector_batch_data_shard_2 ON collector_batch_data_shard (created_at);
CREATE INDEX i_collector_batch_data_shard_3 ON collector_batch_data_shard (created_by);
CREATE INDEX i_collector_batch_data_shard_4 ON collector_batch_data_shard (last_modified_at);
CREATE INDEX i_collector_batch_data_shard_5 ON collector_batch_data_shard (last_modified_by);
