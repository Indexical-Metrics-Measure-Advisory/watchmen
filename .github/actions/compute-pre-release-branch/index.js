const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('version');
    const [major, minor, patch] = targetVersion.split('.');
    // console.log(targetVersion);
    // console.log(major, minor, patch);
    core.exportVariable('PRE_RELEASE_BRANCH_NAME', `pre-release/v${major}.${minor}`);
} catch (error) {
    core.setFailed(error.message);
}