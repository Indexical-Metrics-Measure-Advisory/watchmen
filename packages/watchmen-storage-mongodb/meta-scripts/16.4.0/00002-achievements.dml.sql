db.achievements.updateMany(
    {"indicators.criteria.value": /^year$/i},
    {
        $set: {
            "indicators.$[i].criteria.$[c].value": "{&year}"
        }
    },
    {
        arrayFilters: [
            {"i": {"$ne": null}},
            {"c.value": /^year$/i}
        ]
    }
);
db.achievements.updateMany(
    {"indicators.criteria.value": /^month$/i},
    {
        $set: {
            "indicators.$[i].criteria.$[c].value": "{&month}"
        }
    },
    {
        arrayFilters: [
            {"i": {"$ne": null}},
            {"c.value": /^month$/i}
        ]
    }
);