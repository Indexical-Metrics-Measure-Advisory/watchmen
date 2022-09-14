UPDATE inspections SET measures =
    '[{"type":"'
    || measure_on
    || '", "factorId":'
    || CASE WHEN measure_on_factor_id IS NOT NULL THEN '"' || measure_on_factor_id || '"' ELSE 'null' END
    || ', "bucketId":'
    || CASE WHEN measure_on_bucket_id IS NOT NULL THEN '"' || measure_on_bucket_id || '"' ELSE 'null' END
    || '}]'
WHERE measure_on IS NOT NULL;
