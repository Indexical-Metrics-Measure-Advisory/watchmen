ALTER TABLE pats RENAME TO pats_1;
ALTER TABLE pats_1 RENAME TO pats;
ALTER TABLE pats RENAME COLUMN patid TO pat_id;
ALTER TABLE pats
    MODIFY pat_id VARCHAR2(50);
ALTER TABLE pats RENAME COLUMN tokenid TO token;
ALTER TABLE pats
    MODIFY token VARCHAR2(255);
ALTER TABLE pats RENAME COLUMN userid TO user_id;
ALTER TABLE pats
    MODIFY user_id VARCHAR2(50);
ALTER TABLE pats
    MODIFY username VARCHAR2(50) NULL;
ALTER TABLE pats RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE pats
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE pats
    MODIFY note VARCHAR2(255) NULL;
ALTER TABLE pats
    DROP COLUMN createtime;
ALTER TABLE pats
    DROP COLUMN lastmodified;
ALTER TABLE pats
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
CREATE INDEX i_pats_tenant_id ON pats (tenant_id);
CREATE INDEX i_pats_user_id ON pats (user_id);
CREATE INDEX i_pats_username ON pats (username);
CREATE INDEX i_pats_token ON pats (token);
-- noinspection SqlWithoutWhere
UPDATE pats
SET created_at = SYSDATE;
