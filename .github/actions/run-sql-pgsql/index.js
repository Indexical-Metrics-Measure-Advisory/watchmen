const core = require('@actions/core');
const { Pool } = require('pg');
const fs = require('fs');
const path=require('path');


try {
    const meta_script_path = `./packages/watchmen-storage-postgresql/meta-scripts`;

    const pool = new Pool({
        user: 'admin',
        host: 'localhost',
        database: 'watchmen',
        password: 'admin',
        port: 5432
    });

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

    function do_run(path) {
        var sql = fs.readFileSync(path).toString();
        pool.query(sql, (err, res) => {
            console.log(err, res)
            pool.end()
        })
    }

    travel(meta_script_path,do_run)

} catch (error) {
    core.setFailed(error.message);
}