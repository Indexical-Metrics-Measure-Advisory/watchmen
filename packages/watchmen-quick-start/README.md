# watchmen-quick-start

```shell
cd docker 
docker compose -f docker-compose-mysql.yml up
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
  - Create pat and import test data
  - Create spaces and assign to your user group
- login with console user 
  - connect to space 
  - create dataset and chart 
  - create dashboard


```
DQC and indicator services are not included 
```

This cannot be used in a production environment
If you need to deploy the production environment, please refer to the document production environment deployment
https://imma-watchmen.com/docs/16.0/installation/deploy#production-environment



