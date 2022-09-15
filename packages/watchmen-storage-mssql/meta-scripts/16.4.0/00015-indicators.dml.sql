UPDATE indicators SET aggregate_arithmetic =  IIF(factor_id IS NULL, 'count', 'sum');
