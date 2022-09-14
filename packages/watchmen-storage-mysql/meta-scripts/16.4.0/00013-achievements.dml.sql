UPDATE achievements SET indicators = REGEXP_REPLACE(indicators, '"year"', '"{&year}"', 1, 0, 'i') WHERE indicators IS NOT NULL;
UPDATE achievements SET indicators = REGEXP_REPLACE(indicators, '"month"', '"{&month}"', 1, 0, 'i') WHERE indicators IS NOT NULL;
