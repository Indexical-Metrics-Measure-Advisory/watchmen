db.indicators.updateMany(
    {factorId: {$ne: null}},
    {
        $set: {
            arithmetic: 'sum'
        }
    }
);
db.indicators.updateMany(
    {factorId: {$eq: null}},
    {
        $set: {
            arithmetic: 'count'
        }
    }
);