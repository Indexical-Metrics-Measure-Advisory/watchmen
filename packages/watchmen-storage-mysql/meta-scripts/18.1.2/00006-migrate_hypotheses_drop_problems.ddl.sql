-- Migrate hypotheses from business problems to business challenges.
-- Existing hypotheses are repointed to the parent challenge of their problem (merge upward),
-- then the business_problems table is dropped.
ALTER TABLE hypotheses ADD COLUMN business_challenge_id VARCHAR(50);

UPDATE hypotheses h
JOIN business_problems bp ON h.business_problem_id = bp.id
SET h.business_challenge_id = bp.`businessChallengeId`;

ALTER TABLE hypotheses DROP COLUMN business_problem_id;

DROP TABLE business_problems;

ALTER TABLE business_challenges DROP COLUMN `problemIds`;
