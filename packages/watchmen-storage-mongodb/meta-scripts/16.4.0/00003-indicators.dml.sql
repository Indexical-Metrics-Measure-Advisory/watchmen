db.indicators.updateMany(
    {factorId: {$ne: null}},
    {
        $set: {
            aggregate_arithmetic: 'sum'
        }
    }
);
db.indicators.updateMany(
    {factorId: {$eq: null}},
    {
        $set: {
            aggregate_arithmetic: 'count'
        }
    }
);