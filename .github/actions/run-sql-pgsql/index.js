const core = require('@actions/core');
const { Client } = require('pg');
const fs = require('fs');
const path=require('path');

try {
    const meta_script_path = `./packages/watchmen-storage-postgresql/meta-scripts`;
    const pgclient = new Client({
    host: 'localhost',
    port: '5432',
    user: 'admin',
    password: 'admin',
    database: 'watchmen'
    });
    pgclient.connect();

    function travel(dir,callback){
        fs.readdirSync(dir).forEach((file)=>{
            var pathname=path.join(dir,file)
            if(fs.statSync(pathname).isDirectory()){
                travel(pathname,callback)
            }else{
                console.log(pathname)
                callback(pathname)
            }
        })
    }

    function do_run(path){
        var sql = fs.readFileSync(path).toString();
        pgclient.query(sql, (err, res) => {
            if (err) throw err
        });
    }

    travel(meta_script_path,do_run)
    pgclient.end()
} catch (error) {
    core.setFailed(error.message);
}