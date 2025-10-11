CREATE TABLE semantic_models
(
    id           VARCHAR2(50) NOT NULL,
    name         VARCHAR2(128) NOT NULL,
    description  CLOB,
    node_relation CLOB NOT NULL,
    entities     CLOB NOT NULL,
    measures     CLOB NOT NULL,
    dimensions   CLOB NOT NULL,
    defaults     CLOB,
    primary_entity VARCHAR2(128),
    -- Auditable fields
    created_at   TIMESTAMP    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    topicId         VARCHAR2(50) NOT NULL,
    sourceType      VARCHAR2(50) NOT NULL,
    -- OptimisticLock field
    version      NUMBER(19) NOT NULL,
    -- Tenant field
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_semantic_models PRIMARY KEY (id)
);

CREATE INDEX ix_semantic_models_tenant_id ON semantic_models (tenant_id);
CREATE INDEX ix_semantic_models_name ON semantic_models (name);
CREATE INDEX ix_semantic_models_primary_entity ON semantic_models (primary_entity);
-- Oracle Text index for description field (requires Oracle Text to be installed)
-- CREATE INDEX ix_semantic_models_description ON semantic_models (description) INDEXTYPE IS CTXSYS.CONTEXT;

-- -- Additional tables for semantic model components
--
-- CREATE TABLE semantic_model_entities
-- (
--     id           VARCHAR(50) NOT NULL,
--     semantic_model_id VARCHAR(50) NOT NULL,
--     name         VARCHAR(128) NOT NULL,
--     type         VARCHAR(50) NOT NULL,
--     expr         TEXT NOT NULL,
--     description  TEXT,
--     role         VARCHAR(128),
--     metadata     JSON,
--     label        VARCHAR(255),
--     -- Auditable fields
--     created_at   DATETIME    NOT NULL,
--     created_by   VARCHAR(50) NOT NULL,
--     last_modified_at   DATETIME    NOT NULL,
--     last_modified_by   VARCHAR(50) NOT NULL,
--     -- OptimisticLock field
--     version      DECIMAL(20) NOT NULL,
--     -- Tenant field
--     tenant_id    VARCHAR(50) NOT NULL,
--     CONSTRAINT pk_semantic_model_entities PRIMARY KEY (id),
--     CONSTRAINT fk_entities_semantic_model FOREIGN KEY (semantic_model_id) REFERENCES semantic_models(id) ON DELETE CASCADE
-- );
--
-- CREATE INDEX ix_semantic_model_entities_tenant_id ON semantic_model_entities (tenant_id);
-- CREATE INDEX ix_semantic_model_entities_semantic_model_id ON semantic_model_entities (semantic_model_id);
-- CREATE INDEX ix_semantic_model_entities_name ON semantic_model_entities (name);
-- CREATE INDEX ix_semantic_model_entities_type ON semantic_model_entities (type);
-- CREATE INDEX ix_semantic_model_entities_label ON semantic_model_entities (label);
--
-- CREATE TABLE semantic_model_measures
-- (
--     id           VARCHAR(50) NOT NULL,
--     semantic_model_id VARCHAR(50) NOT NULL,
--     name         VARCHAR(128) NOT NULL,
--     agg          VARCHAR(50) NOT NULL,
--     expr         TEXT NOT NULL,
--     description  TEXT,
--     create_metric BOOLEAN DEFAULT FALSE,
--     agg_params   JSON,
--     metadata     JSON,
--     non_additive_dimension VARCHAR(128),
--     agg_time_dimension VARCHAR(128),
--     label        VARCHAR(255),
--     -- Auditable fields
--     created_at   DATETIME    NOT NULL,
--     created_by   VARCHAR(50) NOT NULL,
--     last_modified_at   DATETIME    NOT NULL,
--     last_modified_by   VARCHAR(50) NOT NULL,
--     -- OptimisticLock field
--     version      DECIMAL(20) NOT NULL,
--     -- Tenant field
--     tenant_id    VARCHAR(50) NOT NULL,
--     CONSTRAINT pk_semantic_model_measures PRIMARY KEY (id),
--     CONSTRAINT fk_measures_semantic_model FOREIGN KEY (semantic_model_id) REFERENCES semantic_models(id) ON DELETE CASCADE
-- );
--
-- CREATE INDEX ix_semantic_model_measures_tenant_id ON semantic_model_measures (tenant_id);
-- CREATE INDEX ix_semantic_model_measures_semantic_model_id ON semantic_model_measures (semantic_model_id);
-- CREATE INDEX ix_semantic_model_measures_name ON semantic_model_measures (name);
-- CREATE INDEX ix_semantic_model_measures_agg ON semantic_model_measures (agg);
-- CREATE INDEX ix_semantic_model_measures_label ON semantic_model_measures (label);
-- CREATE INDEX ix_semantic_model_measures_create_metric ON semantic_model_measures (create_metric);
--
-- CREATE TABLE semantic_model_dimensions
-- (
--     id           VARCHAR(50) NOT NULL,
--     semantic_model_id VARCHAR(50) NOT NULL,
--     name         VARCHAR(128) NOT NULL,
--     type         VARCHAR(50) NOT NULL,
--     expr         TEXT NOT NULL,
--     description  TEXT,
--     is_partition BOOLEAN DEFAULT FALSE,
--     type_params  JSON,
--     metadata     JSON,
--     label        VARCHAR(255),
--     -- Auditable fields
--     created_at   DATETIME    NOT NULL,
--     created_by   VARCHAR(50) NOT NULL,
--     last_modified_at   DATETIME    NOT NULL,
--     last_modified_by   VARCHAR(50) NOT NULL,
--     -- OptimisticLock field
--     version      DECIMAL(20) NOT NULL,
--     -- Tenant field
--     tenant_id    VARCHAR(50) NOT NULL,
--     CONSTRAINT pk_semantic_model_dimensions PRIMARY KEY (id),
--     CONSTRAINT fk_dimensions_semantic_model FOREIGN KEY (semantic_model_id) REFERENCES semantic_models(id) ON DELETE CASCADE
-- );
--
-- CREATE INDEX ix_semantic_model_dimensions_tenant_id ON semantic_model_dimensions (tenant_id);
-- CREATE INDEX ix_semantic_model_dimensions_semantic_model_id ON semantic_model_dimensions (semantic_model_id);
-- CREATE INDEX ix_semantic_model_dimensions_name ON semantic_model_dimensions (name);
-- CREATE INDEX ix_semantic_model_dimensions_type ON semantic_model_dimensions (type);
-- CREATE INDEX ix_semantic_model_dimensions_label ON semantic_model_dimensions (label);
-- CREATE INDEX ix_semantic_model_dimensions_is_partition ON semantic_model_dimensions (is_partition);