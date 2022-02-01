INSERT INTO users(user_id, name, nickname, password, is_active, group_ids, role, tenant_id, created_at, created_by,
                  last_modified_at, last_modified_by, version)
VALUES (1, 'imma.super', 'IMMA Super', '$2b$12$IOCM0MsSulT5KiiMvnkf3OhP7hIu4qbk9VdIm2ex.165WmzZDb5hG', 1, '[]',
        'superadmin', -1, now(), -1, now(), -1, 1);