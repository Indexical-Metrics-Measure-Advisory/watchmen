const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('target-version');
    const [major] = targetVersion.split('.');
    core.exportVariable('TARGET_BRANCH_NAME', `test/${major}.0`)
} catch (error) {
    core.setFailed(error.message);
}