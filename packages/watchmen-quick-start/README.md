# watchmen-quick-start

### MySQL
Before starting, execute dbscript.sh copy script to mysql directory


```shell
cd docker 
docker compose -f docker-compose-mysql.yml up -d
```

### PostgreSQL
Before starting, execute dbscript_pg.sh copy script to postgres directory

```shell
cd docker
docker compose -f docker-compose-pg.yml up -d
```

go to url localhost:3030

#### login with 
- super user ：imma-super/change-me
- admin user  ： imma-admin/1234abcd
- console user ：imma-user/1234abcd



#### General process of playground 
- login with super user
  - create datasource  
- login with admin user 
  - create topics and pipelines 
  - test pipelines with simulator 
  - config data ingestion  
    - config module , model and table
    - run test  
    - monitor data ingestion status
  - Create pat and import test data
  - Create spaces and assign to your user group
- login with console user 
  - connect to space 
  - create dataset and chart 
  - create dashboard


```
- DQC and metrics  services are not included 
```

#### Tips 
The current environment will automatically create table in instance database . 
f you modify the topic structure, it will be deleted and recreated.
ref to documentation [SYNC_TOPIC_TO_STORAGE](https://imma-watchmen.com/docs/16.1/installation/config/)  

If it is not a Mac, please modify docker.for.mac.localhost parameter is configured in nginx

This cannot be used in a production environment
If you need to deploy the production environment, please refer to the document production environment deployment
https://imma-watchmen.com/docs/16.0/installation/deploy#production-environment



