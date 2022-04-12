const core = require('@actions/core');
const fs = require('fs');

try {
    const tag = core.getInput('tag');
    core.exportVariable('RELEASE_VERSION', tag.replace('r-', ''));
} catch (error) {
    core.setFailed(error.message);
}