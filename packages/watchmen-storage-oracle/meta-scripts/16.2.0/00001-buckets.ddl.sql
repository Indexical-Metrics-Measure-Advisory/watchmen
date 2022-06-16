CREATE TABLE buckets
(
    bucket_id        VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50),
    type             VARCHAR2(20) NOT NULL,
    include          VARCHAR2(20),
    measure          VARCHAR2(20),
    enum_id          VARCHAR2(50),
    segments         CLOB,
    description      VARCHAR2(1024),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
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
