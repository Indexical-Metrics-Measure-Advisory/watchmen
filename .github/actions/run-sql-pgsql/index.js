const core = require('@actions/core');
const {Pool} = require('pg');
const fs = require('fs');
const path = require('path');


try {
    const meta_script_path = core.getInput('script-path');

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

            function sort_version(f1: any, f2: any): number {
                const f1_ver_list: string[] = f1.split('.');
	            const f2_ver_list: string[] = f2.split('.');
	            for(let i = 0; i<3; i++)
		        if (parseInt(f1_ver_list[i]) < parseInt(f2_ver_list[i])){
			        return -1
		        }
	            return 1
            }

            function is_version_path(file_path: string): boolean {
	            const rExp : RegExp = new RegExp('\\d+\.\\d+\.\\d+');
	            return rExp.test(file_path)
            }

            const path = fs.readdirSync(meta_script_path);
            const  = []
            for(let file_path of path){
		        if (is_version_path(file_path)){
			        sorted_version.push(file_path)
		        }
	        }
	        sorted_version.sort(sort_version)
            for (const file of sorted_version){
                var pathname = path.join(dir, file)
                sql = fs.readFileSync(pathname).toString();
                await client.query(sql)
            }
        } finally {
            client.release()
            pool.end()
        }

    })()


} catch (error) {
    core.setFailed(error.message);
}