const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('version');
    const [major] = targetVersion.split('.');
    core.exportVariable('PRE_RELEASE_BRANCH_NAME', `pre-release/v-${major}.0`)
} catch (error) {
    core.setFailed(error.message);
}