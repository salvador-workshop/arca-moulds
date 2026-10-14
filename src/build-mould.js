import { exec } from "child_process";
import fs from 'node:fs';
import { join, relative } from 'path';

import {
    inputDir,
    outputDir,
    internalDir,
    internalWorkspaceDir,
    isDirectory,
    mouldCfgName,
    mouldSubjectName,
    baseIndexPathOnePart,
    clearInternalDir
} from './utils.js'

const pEnv = process.env
const inputProject = pEnv.npm_config_project ? pEnv.npm_config_project : ""

let detectedProject = false
let errMsg = ''

console.log('----------------------------------------------------------------\n')
console.log('> Preparing to build mould from project in `src/input/`...')

let projId = null
if (!inputProject) {
    errMsg = '> No project specified!'
    console.error(errMsg)
} else {
    projId = inputProject
}

const directoryListLong = fs.readdirSync(inputDir)
    .map(fileOrDirName => {
        return join(inputDir, fileOrDirName);
    })
    .filter(isDirectory);

const directoryList = directoryListLong.map(longDir => {
    const displayDir = relative(inputDir, longDir)
    return displayDir
})
console.log(directoryListLong)
console.log(directoryList)

let projInputDir = null
if (directoryList.includes(projId)) {
    detectedProject = true
    projInputDir = join(inputDir, projId)
}

console.log(`> Found project: ${projId}`)

if (detectedProject) {
    // set up output directory
    const projOutputDir = join(outputDir, projId)
    try {
        if (!fs.existsSync(projOutputDir)) {
            fs.mkdirSync(projOutputDir);
        }
    } catch (err) {
        console.error(err);
    }

    // set up internal directory
    const projInternalDir = internalWorkspaceDir
    try {
        clearInternalDir()
        if (!fs.existsSync(projInternalDir)) {
            fs.mkdirSync(projInternalDir);
        }
    } catch (err) {
        console.error(err);
    }

    // copy data into internal dir
    try {
        const cfgPath = join(projInputDir, mouldCfgName)
        const modelPath = join(projInputDir, mouldSubjectName)

        const cfgDestPath = join(projInternalDir, mouldCfgName)
        const modelDestPath = join(projInternalDir, mouldSubjectName)
        const baseIndexDestPath = join(projInternalDir, 'index.js')

        fs.copyFileSync(cfgPath, cfgDestPath)
        fs.copyFileSync(modelPath, modelDestPath)
        fs.copyFileSync(baseIndexPathOnePart, baseIndexDestPath)
    } catch (err) {
        console.error(err);
    }

    // run JSCAD
    // const cmdString = `npx jscad src/input/${projId}/ -o output/${projId}/${projId}.stl`
    const cmdString = `npx jscad ${internalWorkspaceDir}/ -gp -o output/${projId}/${projId}-mould.stl`
    exec(cmdString, (err, stdout, stderr) => {
        if (err) {
            console.error("Error:");
            console.error(err);
        }
        console.log(stdout);
        console.error(stderr);
    });
} else {
    errMsg = '> Project not found!'
    console.error(errMsg)
}

console.log('\n----------------------------------------------------------------\n')
