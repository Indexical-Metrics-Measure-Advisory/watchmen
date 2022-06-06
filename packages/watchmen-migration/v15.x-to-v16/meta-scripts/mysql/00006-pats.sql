-- noinspection SqlResolveForFile
RENAME TABLE pats TO pats_1;
RENAME TABLE pats_1 TO pats;
ALTER TABLE pats
    CHANGE patid pat_id VARCHAR(50) NOT NULL;
ALTER TABLE pats
    CHANGE tokenid token VARCHAR(255) NOT NULL;
ALTER TABLE pats
    CHANGE userid user_id VARCHAR(50) NOT NULL;
ALTER TABLE pats
    MODIFY username VARCHAR(50) NULL;
ALTER TABLE pats
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE pats
    MODIFY note VARCHAR(255) NULL;
ALTER TABLE pats
    DROP createtime;
ALTER TABLE pats
    DROP lastmodified;
ALTER TABLE pats
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
CREATE INDEX tenant_id ON pats (tenant_id);
CREATE INDEX user_id ON pats (user_id);
CREATE INDEX username ON pats (username);
CREATE INDEX token ON pats (token);
-- noinspection SqlWithoutWhere
UPDATE pats
SET created_at = NOW();
