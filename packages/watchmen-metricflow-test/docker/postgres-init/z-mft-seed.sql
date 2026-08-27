-- Dedicated principals for the metricflow API test-suite + a dialect-bug fix.
--
-- Runs on first boot of an empty volume, AFTER init.sh has created the schema
-- (filename sorts after 'init.sh' alphabetically).
--
-- 1) pats.expired is created as DATE by the postgres meta-scripts, while
--    watchmen_auth.find_pat_by_token compares it against datetime.now() — a
--    datetime-vs-date TypeError that swallows every PAT authentication.
--    Widening to TIMESTAMP matches the mysql dialect and unblocks PAT auth.
-- 2) The suite authenticates with a dedicated tenant-admin + PAT; the app
--    mounts no /login route, so a seeded PAT row is the only auth channel.

-- widen expired to timestamp (idempotent on this volume: runs once)
ALTER TABLE pats ALTER COLUMN expired TYPE TIMESTAMP USING expired::timestamp;

-- semantic_models.topic_id is NOT NULL in the postgres meta-scripts, but
-- db_source semantic models carry their connection in node_relation and have
-- no topic. Relax to match the model layer (Optional topicId).
ALTER TABLE semantic_models ALTER COLUMN topic_id DROP NOT NULL;

-- dedicated tenant-admin under the seeded tenant '1'
INSERT INTO users (user_id, name, nickname, password, is_active, role, tenant_id,
                   created_at, created_by, last_modified_at, last_modified_by)
SELECT '1900000000000000001', 'mft-admin', 'MFT Admin',
       '$2b$12$5TMHNKiU/J6K5ih7bEwAxe7nV7/SNwmJ0jtEDaj4lvc8sniQQjDQW', -- mft-admin-pwd
       1, 'admin', '1', now(), 'mft-seed', now(), 'mft-seed'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'mft-admin');

-- its PAT; the suite sends: Authorization: pat mft-pat-local-001
INSERT INTO pats (pat_id, token, user_id, username, tenant_id, note, expired, created_at)
SELECT '1900000000000000002', 'mft-pat-local-001', '1900000000000000001',
       'mft-admin', '1', 'metricflow-test suite', '2035-01-01', now()
WHERE NOT EXISTS (SELECT 1 FROM pats WHERE token = 'mft-pat-local-001');
