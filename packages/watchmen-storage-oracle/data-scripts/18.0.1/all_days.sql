WITH p AS (
    SELECT 0 AS generated_number FROM DUAL
    UNION ALL
    SELECT 1 AS generated_number FROM DUAL
),
unioned AS (
    SELECT
    p0.generated_number * power(2, 0)
     + 
    p1.generated_number * power(2, 1)
     + 
    p2.generated_number * power(2, 2)
     + 
    p3.generated_number * power(2, 3)
     + 
    p4.generated_number * power(2, 4)
     + 
    p5.generated_number * power(2, 5)
     + 
    p6.generated_number * power(2, 6)
     + 
    p7.generated_number * power(2, 7)
     + 
    p8.generated_number * power(2, 8)
     + 
    p9.generated_number * power(2, 9)
    + 1
    as generated_number
    FROM
    p p0
     cross join 
    p p1
     cross join 
    p p2
     cross join 
    p p3
     cross join 
    p p4
     cross join 
    p p5
     cross join 
    p p6
     cross join 
    p p7
     cross join 
    p p8
     cross join 
    p p9
),
rawdata AS (
    SELECT *
    FROM unioned
    WHERE generated_number <= 731
),
all_periods AS (
    SELECT (
        TO_DATE('2024-01-01', 'YYYY-MM-DD') + (ROW_NUMBER() OVER (ORDER BY generated_number) - 1)
    ) as date_day
    FROM rawdata
),
filtered AS (
    SELECT *
    FROM all_periods
    WHERE date_day < TO_DATE('2026-01-01', 'YYYY-MM-DD')
),
final AS (
    SELECT CAST(date_day AS DATE) as date_day
    FROM filtered
)
SELECT * FROM final
WHERE date_day >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
AND date_day < TO_DATE('2026-01-01', 'YYYY-MM-DD')
