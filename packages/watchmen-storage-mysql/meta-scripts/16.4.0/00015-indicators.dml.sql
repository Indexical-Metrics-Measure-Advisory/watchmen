UPDATE indicators SET arithmetic = IF(factor_id IS NULL, 'count', 'sum');
