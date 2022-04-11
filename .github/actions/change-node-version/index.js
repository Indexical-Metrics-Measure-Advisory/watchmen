const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

try {
    const targetVersion = core.getInput('target-version');
    const packageFile = core.getInput('package-file');

    const content = fs.readFileSync(packageFile, 'utf8');
    const packageJson = JSON.parse(data);
    packageJson.version = targetVersion;
    const newContent = JSON.stringify(packageJson, null, 2);
    fs.writeFileSync(packageFile, newContent, 'utf8');
    console.log(newContent);
} catch (error) {
    core.setFailed(error.message);
}