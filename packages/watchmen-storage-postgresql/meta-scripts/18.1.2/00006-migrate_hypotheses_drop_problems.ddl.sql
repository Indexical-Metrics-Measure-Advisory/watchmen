-- Migrate hypotheses from business problems to business challenges.
-- Existing hypotheses are repointed to the parent challenge of their problem (merge upward),
-- then the business_problems table is dropped.
-- NOTE: camelCase columns (businessChallengeId, problemIds) were created unquoted,
-- so PostgreSQL folded them to lowercase.
ALTER TABLE hypotheses ADD COLUMN IF NOT EXISTS business_challenge_id VARCHAR(50);

UPDATE hypotheses h
SET business_challenge_id = bp.businesschallengeid
FROM business_problems bp
WHERE h.business_problem_id = bp.id;

ALTER TABLE hypotheses DROP COLUMN business_problem_id;

DROP TABLE business_problems;

ALTER TABLE business_challenges DROP COLUMN problemids;
