CREATE TABLE buckets
(
    bucket_id        NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50),
    type             NVARCHAR(20) NOT NULL,
    include          NVARCHAR(20),
    measure          NVARCHAR(20),
    enum_id          NVARCHAR(50),
    segments         NVARCHAR(MAX),
    description      NVARCHAR(1024),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
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
