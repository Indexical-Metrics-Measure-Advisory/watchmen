const path = require('path')
const fs = require('fs')
const {getAllFiles} = require('./utils')
require('colors')

const root = path.join(__dirname, '../src');
const files = getAllFiles(root)
const failure = files.filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
	.map(file => file.replace(root, ''))
	.map(file => ({...path.parse(file), file}))
	.filter(p => p.dir !== '/')
	.map(p => ({...p, first: p.dir.match(/^\/([^\/]+).*/)[1]}))
	.filter(p => {
		return fs.readFileSync(path.join(root, p.file), 'UTF-8')
			.split(/\r?\n/)
			.filter(line => line.includes('\'@/'))
			.some(line => line.includes(`\'@/${p.first}/`))
	}).sort((p1, p2) => {
		return p1.file.toUpperCase().localeCompare(p2.file.toUpperCase())
	}).map((p, index) => {
		console.log(`${index + 1}.\t` + p.file.red)
	}).length !== 0

if (failure) {
	console.log('Do import lint validating successfully, please fix the above issues.'.bold.underline.red)
} else {
	console.log('Do import lint validating successfully, no failure found.'.bold.underline.green)
}

const i18nStr = fs.readFileSync(path.join(root, 'widgets/langs/en.tsx'), 'UTF-8')
	.replace('import React from \'react\';', '')
	.replace('export const En = ', '')
	.split(/\r?\n/)
	.map(line => line.trim())
	.filter(line => !line.startsWith('// '))
	.map(line => line.split(': \''))
	.map(parts => {
		if (parts.length === 2) {
			return `"${parts[0]}":${parts[1].endsWith(',') ? '"",' : '""'}`
		} else if (parts[0].endsWith(': {')) {
			return `"${parts[0].replace(': {', '": {')}`
		} else if (parts[0].endsWith('};')) {
			return '}';
		} else if (parts[0].includes(': <')) {
			return `"${parts[0].split(': <')[0]}":${parts[0].endsWith(',') ? '"",' : '""'}`
		} else {
			return parts.join('')
		}
	}).join('');
const i18n = JSON.parse(i18nStr);
const findKeys = (key, parentKey, map) => {
	const qualifiedKey = parentKey == null ? [key] : [`${parentKey}.${key}`]
	const value = map[key]
	if (value === '') {
		return qualifiedKey
	} else {
		return Object.keys(value).map(key => findKeys(key, qualifiedKey, value)).flat();
	}
}
const i18nKeys = Object.keys(i18n)
	.map(key => findKeys(key, null, i18n))
	.flat()
files
	.filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
	.forEach(file => {
		const content = fs.readFileSync(file, 'UTF-8')
		i18nKeys.map(key => key).forEach(key => {
			if (content.includes(`.${key}`)) {
				i18nKeys.splice(i18nKeys.indexOf(key), 1)
			}
		})
	});
console.log('')
i18nKeys.forEach((key, index) => {
	console.log(`${index + 1}.\t` + key.red)
});
if (failure) {
	console.log('Do i18n keys lint validating successfully, please fix the above issues.'.bold.underline.red)
} else {
	console.log('Do i18n keys lint validating successfully, no failure found.'.bold.underline.green)
}
