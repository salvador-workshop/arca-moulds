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

export const isDirectory = fileName => {
    return fs.lstatSync(fileName).isDirectory();
};

export const removeAllFilesSync = directory => {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = join(directory, file);
        fs.unlinkSync(filePath);
    }
}

export const clearInternalDir = () => {
    removeAllFilesSync(internalDir)
}
