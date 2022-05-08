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

    const client = await pool.connect()

     function travel(dir){
        try{
            fs.readdirSync(dir).forEach(async (file)=>{
                var pathname=path.join(dir,file)
                if(fs.statSync(pathname).isDirectory()){
                    travel(pathname)
                }else{
                    console.log(pathname)
                    sql = fs.readFileSync(pathname).toString();
                    await client.query(sql)
                }
            })
        } finally {
            client.release()
            pool.end()
        }
    }

    travel(meta_script_path)

} catch (error) {
    core.setFailed(error.message);
}