UPDATE inspections SET measures =
    CAST(CONCAT(
        '[{"type":"',
        measure_on,
        '", "factorId":',
        CASE WHEN measure_on_factor_id IS NOT NULL THEN CONCAT('"', measure_on_factor_id, '"') ELSE 'null' END,
        ', "bucketId":',
        CASE WHEN measure_on_bucket_id IS NOT NULL THEN CONCAT('"', measure_on_bucket_id, '"') ELSE 'null' END,
        '}]') AS JSON)
WHERE measure_on IS NOT NULL;
