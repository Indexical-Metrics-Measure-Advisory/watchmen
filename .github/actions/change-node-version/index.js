const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('target-version');
    const moduleName = core.getInput('module-name');
    const packageFile = `./packages/${moduleName}/package.json`;
    const content = fs.readFileSync(packageFile, 'utf8');
    const packageJson = JSON.parse(content);
    core.notice(`For module[${moduleName}], version updated to ${targetVersion} from ${packageJson.version}.`);
    packageJson.version = targetVersion;
    const newContent = JSON.stringify(packageJson, null, 2);
    fs.writeFileSync(packageFile, newContent, 'utf8');
} catch (error) {
    core.setFailed(error.message);
}