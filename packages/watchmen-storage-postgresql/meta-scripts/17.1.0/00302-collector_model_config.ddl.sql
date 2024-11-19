ALTER TABLE collector_model_config ALTER COLUMN version TYPE INTEGER USING version::INTEGER;
ALTER TABLE collector_model_config ALTER COLUMN priority TYPE SMALLINT USING priority::SMALLINT;