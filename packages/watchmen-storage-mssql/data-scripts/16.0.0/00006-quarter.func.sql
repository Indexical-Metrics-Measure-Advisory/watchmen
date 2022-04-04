CREATE OR ALTER FUNCTION QUARTER(@a_date DATETIME)
    RETURNS INT
AS
BEGIN
    DECLARE @month_of_given_date INT= MONTH(@a_date);
    DECLARE @quarter INT;

    SELECT @quarter = CASE
                          WHEN @month_of_given_date <= 3 THEN 1
                          WHEN @month_of_given_date <= 6 THEN 2
                          WHEN @month_of_given_date <= 9 THEN 3
                          ELSE 4
        END;

    RETURN @quarter;
END;
GO
