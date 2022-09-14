UPDATE indicators SET arithmetic = CASE WHEN factor_id IS NULL THEN 'count' ELSE 'sum' END;
