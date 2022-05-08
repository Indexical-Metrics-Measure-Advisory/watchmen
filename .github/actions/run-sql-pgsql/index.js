const core = require('@actions/core');
const {Pool} = require('pg');
const fs = require('fs');
const path = require('path');


try {
    const meta_script_path = `./packages/watchmen-storage-postgresql/meta-scripts`;

    const pool = new Pool({
        user: 'admin',
        host: 'localhost',
        database: 'watchmen',
        password: 'admin',
        port: 5432
    });

    (async () => {
        try {
            var client = await pool.connect()

            async function travel(dir) {
                for (file in fs.readdirSync(dir)){
                    var pathname = path.join(dir, file)
                    if (fs.statSync(pathname).isDirectory()) {
                        travel(pathname)
                    } else {
                        console.log(pathname)
                        sql = fs.readFileSync(pathname).toString();
                        await client.query(sql)
                    }
                }
            }

            await travel(meta_script_path)
        } finally {
            client.release()
            pool.end()
        }

    })()


} catch (error) {
    core.setFailed(error.message);
}