UPDATE achievements SET indicators = REGEXP_REPLACE(indicators, '"(?i)year"', '"{&year}"') WHERE indicators IS NOT NULL;
UPDATE achievements SET indicators = REGEXP_REPLACE(indicators, '"(?i)month"', '"{&month}"') WHERE indicators IS NOT NULL;
