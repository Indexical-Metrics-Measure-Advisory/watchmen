db.collector_competitive_lock.drop()
db.competitive_lock.createIndex({resource_id:1}, {unique:true})