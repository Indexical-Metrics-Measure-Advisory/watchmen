-- Generate a date spine for MySQL from 2024-01-01 up to (but excluding) 2026-01-01.
-- Uses bitwise expansion via CROSS JOIN to produce numbers from 1..731.

WITH 
    p AS (
        SELECT 0 AS generated_number UNION ALL SELECT 1
    ),
    unioned AS (
        SELECT 
            p0.generated_number * POW(2, 0)
          + p1.generated_number * POW(2, 1)
          + p2.generated_number * POW(2, 2)
          + p3.generated_number * POW(2, 3)
          + p4.generated_number * POW(2, 4)
          + p5.generated_number * POW(2, 5)
          + p6.generated_number * POW(2, 6)
          + p7.generated_number * POW(2, 7)
          + p8.generated_number * POW(2, 8)
          + p9.generated_number * POW(2, 9)
          + 1 AS generated_number
        FROM p AS p0
        CROSS JOIN p AS p1
        CROSS JOIN p AS p2
        CROSS JOIN p AS p3
        CROSS JOIN p AS p4
        CROSS JOIN p AS p5
        CROSS JOIN p AS p6
        CROSS JOIN p AS p7
        CROSS JOIN p AS p8
        CROSS JOIN p AS p9
    ),
    rawdata AS (
        SELECT *
        FROM unioned
        WHERE generated_number <= 731
        ORDER BY generated_number
    ),
    all_periods AS (
        SELECT DATE('2024-01-01') + INTERVAL (generated_number - 1) DAY AS date_day
        FROM rawdata
    )
SELECT CAST(date_day AS DATE) AS date_day
FROM all_periods
WHERE date_day >= DATE('2024-01-01')
  AND date_day < DATE('2026-01-01');
