UPDATE indicators SET aggregate_arithmetic = IF(factor_id IS NULL, 'count', 'sum');
