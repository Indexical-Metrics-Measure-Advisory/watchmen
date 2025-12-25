UPDATE indicators SET aggregate_arithmetic = CASE WHEN factor_id IS NULL THEN 'count' ELSE 'sum' END;
