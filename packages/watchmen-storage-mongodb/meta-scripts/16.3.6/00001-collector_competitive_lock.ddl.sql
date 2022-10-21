db.oss_collector_competitive_lock.renameCollection("collector_competitive_lock")
db.collector_competitive_lock.dropIndex({model_name:1, object_id:1})
db.collector_competitive_lock.createIndex({resource_id:1}, {unique:true})
