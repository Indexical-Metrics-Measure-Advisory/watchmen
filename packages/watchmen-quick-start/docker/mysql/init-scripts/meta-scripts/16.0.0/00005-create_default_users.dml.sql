# noinspection SpellCheckingInspectionForFile
INSERT INTO users(user_id, name, nickname, password, is_active, group_ids, role, tenant_id, created_at, created_by,
                  last_modified_at, last_modified_by, version)
VALUES (1, 'imma-super', 'IMMA Super', '$2b$12$TLbw0H1y70TRO51Jf6V6y.Yf8aHO.xr7VcCdsZInYk5qhSf8Po6Bu', 1, '[]',
        'superadmin', -1, now(), -1, now(), -1, 1);
INSERT INTO users(user_id, name, nickname, password, is_active, group_ids, role, tenant_id, created_at, created_by,
                  last_modified_at, last_modified_by, version)
VALUES (2, 'imma-admin', 'IMMA Admin', '$2b$12$kBzIsBbQYaqR5fu89ph6OO.KkYCO0IIXLflqRBTHZ8/oIxXxnX0Oi', 1, '[]',
        'admin', 1, now(), 1, now(), 1, 1);
INSERT INTO users(user_id, name, nickname, password, is_active, group_ids, role, tenant_id, created_at, created_by,
                  last_modified_at, last_modified_by, version)
VALUES (3, 'imma-user', 'IMMA User', '$2b$12$9kuzj0k/oFrknTm6XIRlGOKfHWS3.yr33drk/QTWuW.Lt86t0TKFu', 1, '[]',
        'console', 1, now(), 1, now(), 1, 1);
