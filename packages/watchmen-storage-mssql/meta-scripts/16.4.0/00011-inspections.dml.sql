UPDATE inspections SET measures =
    CONCAT(
        '[{"type":"',
        measure_on,
        '", "factorId":',
        IIF(measure_on_factor_id IS NOT NULL, CONCAT('"', measure_on_factor_id, '"'), 'null'),
        ', "bucketId":',
        IIF(measure_on_bucket_id IS NOT NULL, CONCAT('"', measure_on_bucket_id, '"'), 'null'),
        '}]')
WHERE measure_on IS NOT NULL;
