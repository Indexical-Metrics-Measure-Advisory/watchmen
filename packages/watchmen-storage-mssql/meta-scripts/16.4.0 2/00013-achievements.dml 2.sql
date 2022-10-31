UPDATE achievements SET indicators = REPLACE(indicators, '"year"', '"{&year}"') WHERE indicators IS NOT NULL;
UPDATE achievements SET indicators = REPLACE(indicators, '"month"', '"{&month}"') WHERE indicators IS NOT NULL;
