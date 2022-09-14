UPDATE indicators SET arithmetic =  IIF(factor_id IS NULL, 'count', 'sum');
