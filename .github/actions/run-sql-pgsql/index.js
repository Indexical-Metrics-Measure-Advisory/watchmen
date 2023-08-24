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

            function sort_version(f1, f2){
                const f1_ver_list = f1.split('.');
	            const f2_ver_list = f2.split('.');
	            for(let i = 0; i<3; i++){
	                if (parseInt(f1_ver_list[i]) < parseInt(f2_ver_list[i])){
			            return -1
		            }
	            }
	            return 1
            }

            function is_version_folder(path_name){
	            const rExp = new RegExp('\\d+\.\\d+\.\\d+');
	            return rExp.test(path_name)
            }

            const files_or_folders = fs.readdirSync(meta_script_path);
            const sorted_version = []
            for(let file_or_folder of files_or_folders){
		        if (is_version_folder(file_or_folder)){
			        sorted_version.push(file_or_folder)
		        }
	        }
	        sorted_version.sort(sort_version)
	        console.log(sorted_version)
            for (const version of sorted_version){
                 var version_path_name = path.join(meta_script_path, version)
                 for (const file of fs.readdirSync(version_path_name)){
                    var file_path_name = path.join(version_path_name, file)
                    sql = fs.readFileSync(file_path_name).toString();
                    await client.query(sql)
                 }
            }
        } finally {
            client.release()
            pool.end()
        }

    })()


} catch (error) {
    core.setFailed(error.message);
}