UPDATE achievements SET indicators = CAST(REGEXP_REPLACE(CAST(indicators AS VARCHAR), '"year"', '"{&year}"', 'ig') AS JSON) WHERE indicators IS NOT NULL;
UPDATE achievements SET indicators = CAST(REGEXP_REPLACE(CAST(indicators AS VARCHAR), '"month"', '"{&month}"', 'ig') AS JSON) WHERE indicators IS NOT NULL;
