import fs from 'node:fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const srcDir = dirname(fileURLToPath(import.meta.url));
export const rootDir = join(srcDir, '..')
export const inputDir = join(srcDir, '../input')
export const outputDir = join(srcDir, '../output')
export const internalDir = join(srcDir, '../internal')
export const internalWorkspaceDir = join(internalDir, 'workspace')

export const mouldCfgName = 'config.json'
export const mouldSubjectName = 'model.stl'
export const baseIndexNameOnePart = 'base-index-one-part.js'
export const baseIndexNameTwoPart = 'base-index-two-part.js'

export const baseIndexPathOnePart = join(srcDir, baseIndexNameOnePart)
export const baseIndexPathTwoPart = join(srcDir, baseIndexNameTwoPart)

export const isDirectory = fileName => {
    return fs.lstatSync(fileName).isDirectory();
};

export const removeAllFilesSync = directory => {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = join(directory, file);
        // const stats = fs.statSync(filePath);
        // console.log(stats.mode)
        // fs.chmod(filePath, 0o200, (err) => {
        //     if (err) throw err;
        //     console.log(`The permissions for file "${filePath}" have been changed.`);
        // });
        // fs.chmodSync(filePath, 0o766)
        // fs.unlinkSync(filePath);
        fs.rmSync(filePath, { recursive: true, force: true });
    }
}

export const clearInternalDir = () => {
    removeAllFilesSync(internalDir)
}
