

with days as (
    -- Only generate dates for 2022 since that's what's in the seed data.
    -- Note that `date_spine` does not include the end date.
    


    


    with rawdata as (

        

    

    with p as (
        select 0 as generated_number union all select 1
    ), unioned as (

    select

    
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

    from

    
    p as p0
     cross join 
    
    p as p1
     cross join 
    
    p as p2
     cross join 
    
    p as p3
     cross join 
    
    p as p4
     cross join 
    
    p as p5
     cross join 
    
    p as p6
     cross join 
    
    p as p7
     cross join 
    
    p as p8
     cross join 
    
    p as p9
    
    

    )

    select *
    from unioned
    where generated_number <= 731
    order by generated_number



    ),

    all_periods as (

        select (
            

    make_date(2024, 1, 1) + ((interval '1 day') * (row_number() over (order by 1) - 1))


        ) as date_day
        from rawdata

    ),

    filtered as (

        select *
        from all_periods
        where date_day <= make_date(2026, 1, 1)

    )

    select * from filtered



),

final as (
    select cast(date_day as date) as date_day
    from days
)


select * from final
where date_day >= DATE '2024-01-01'
and date_day  < DATE '2026-01-01'