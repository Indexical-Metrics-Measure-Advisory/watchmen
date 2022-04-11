const core = require('@actions/core');
const fs = require('fs');

try {
    const targetVersion = core.getInput('target-version');
    const projectFile = core.getInput('project-file');
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
                .replace(/version\s?=/, '"version" =')
                .replace(/path\s?=/, '"path" =')
                .replace(/develop\s?=/, '"develop" =')
                .replace(/optional\s?=/, '"optional" =')
            console.log(version);
            if (version.startsWith('"')) {
                return line;
            } else {
                const json = JSON.parse(version);
                if (json.develop) {
                    delete json.develop;
                    delete json.path;
                    versionUpdated = true;
                    if (json.optional) {
                        console.log(`Version updated to ${targetVersion} from develop dependency, and it is optional.`);
                        return `${name} = { version = "${targetVersion}", optional = true }`;
                    } else {
                        console.log(`Version updated to ${targetVersion} from develop dependency.`);
                        return `${name} = "${targetVersion}"`;
                    }
                } else {
                    return line;
                }
            }
        }
    }).join('\n');
    if (!versionUpdated) {
        console.log('No version needs to be updated.');
    } else {
        fs.writeFileSync(projectFile, newContent, 'utf8');
        console.log(newContent);
    }
} catch (error) {
    core.setFailed(error.message);
}