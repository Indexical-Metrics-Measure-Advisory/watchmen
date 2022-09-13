db.inspections.updateMany(
    {measureOn: {$ne: null}},
    {
        $set: {
            measures: {
                type: "$measureOn",
                factorId: "$measureOnFactorId",
                bucketId: "$measureOnBucketId"
            }
        }
    }
);