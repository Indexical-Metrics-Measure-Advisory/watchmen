-- Migrate hypotheses from business problems to business challenges.
-- Existing hypotheses are repointed to the parent challenge of their problem (merge upward),
-- then the business_problems table is dropped.
ALTER TABLE hypotheses ADD business_challenge_id VARCHAR2(50);

UPDATE hypotheses h
SET h.business_challenge_id = (
    SELECT bp.businessChallengeId
    FROM business_problems bp
    WHERE bp.id = h.business_problem_id
)
WHERE EXISTS (
    SELECT 1
    FROM business_problems bp
    WHERE bp.id = h.business_problem_id
);

ALTER TABLE hypotheses DROP COLUMN business_problem_id;

DROP TABLE business_problems;

ALTER TABLE business_challenges DROP COLUMN problemIds;
