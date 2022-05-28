CREATE TABLE buckets
(
    bucket_id        VARCHAR(50) NOT NULL,
    name             VARCHAR(50),
    type             VARCHAR(20) NOT NULL,
    include          VARCHAR(20),
    measure          VARCHAR(20),
    enum_id          VARCHAR(50),
    segments         JSON,
    description      VARCHAR(1024),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_buckets PRIMARY KEY (bucket_id)
);
CREATE INDEX i_buckets_1 ON buckets (name);
CREATE INDEX i_buckets_2 ON buckets (type);
CREATE INDEX i_buckets_3 ON buckets (measure);
CREATE INDEX i_buckets_4 ON buckets (enum_id);
CREATE INDEX i_buckets_5 ON buckets (tenant_id);
CREATE INDEX i_buckets_6 ON buckets (created_at);
CREATE INDEX i_buckets_7 ON buckets (created_by);
CREATE INDEX i_buckets_8 ON buckets (last_modified_at);
CREATE INDEX i_buckets_9 ON buckets (last_modified_by);
