const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('target-version');
    const moduleName = core.getInput('module-name');
    const projectFile = `./packages/${moduleName}/pyproject.toml`;
    const content = fs.readFileSync(projectFile, 'utf8');
    const lines = content.split('\n');
    let versionUpdated = false;
    let startToReplace = false;
    const newContent = lines.map((line) => {
        if (line.includes('[tool.poetry.dependencies]')) {
            startToReplace = true;
            return line;
        } else if (startToReplace) {
            if (line.startsWith('[')) {
                startToReplace = false;
                return line;
            } else if (line.trim().length === 0) {
                return line;
            }
            const pos = line.indexOf('=');
            const name = line.substring(0, pos).trim();
            const version = line.substring(pos + 1).trim()
                .replace(/version\s?=/, '"version":')
                .replace(/path\s?=/, '"path":')
                .replace(/develop\s?=/, '"develop":')
                .replace(/optional\s?=/, '"optional":')
            if (version.startsWith('"')) {
                return line;
            } else {
                const json = JSON.parse(version);
                if (json.develop) {
                    delete json.develop;
                    delete json.path;
                    versionUpdated = true;
                    if (json.optional) {
                        core.notice(`For module[${moduleName}], version updated to ${targetVersion} from develop dependency, and it is optional.`);
                        return `${name} = { version = "${targetVersion}", optional = true }`;
                    } else {
                        core.notice(`For module[${moduleName}], version updated to ${targetVersion} from develop dependency.`);
                        return `${name} = "${targetVersion}"`;
                    }
                } else {
                    return line;
                }
            }
        } else if (line.startsWith('version=') || line.startsWith('version =')) {
            const originalVerion = line.replace('version', '').trim().substring(1).replace('"', '').trim();
            core.notice(`For module[${moduleName}], version updated to ${targetVersion} from ${originalVerion}.`);
            return `version = "${targetVersion}"`;
        } else {
            return line;
        }
    }).join('\n');
    if (!versionUpdated) {
        core.notice(`For module[${moduleName}], no version needs to be updated.`);
    }
    fs.writeFileSync(projectFile, newContent, 'utf8');
} catch (error) {
    core.setFailed(error.message);
}