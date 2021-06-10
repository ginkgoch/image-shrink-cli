const fs = require('fs');
const path = require('path');
const imagemin = require("imagemin");
const imageminPngquant = require("imagemin-pngquant");
const { assert } = require('console');

const supportedExtensions = ['.png'];

class ImageFile {
    constructor(filepath, rootDir) {
        this.filepath = filepath;
        this.size = fs.statSync(filepath).size;
        this.isValid = fs.existsSync(filepath) && supportedExtensions.includes(path.extname(filepath));
        this.relPath = path.relative(rootDir, filepath);
    }
}

function readdirRecursiveSync(dirname, validate = false) {
    if (validate) {
        assert(fs.existsSync(dirname), `dirname<${dirname}> not found`)
        assert(fs.statSync(dirname).isDirectory(), `dirname<${dirname}> is not a directory`);
    }

    const files = [];
    const items = fs.readdirSync(dirname).map(p => path.join(dirname, p));
    for (let i of items) {
        const itemState = fs.statSync(i);
        if (itemState.isFile()) {
            files.push(i);
        }
        else if (itemState.isDirectory()) {
            files.push(...readdirRecursiveSync(i, false));
        }
    }

    return files;
}

function formatFileSize(sizeInBytes) {
    const units = ['b', 'k', 'm', 'g'];
    const kilo = 1024;

    let unitIndex = 0;
    let currentSize = sizeInBytes, currentUnit;
    while (unitIndex < units.length) {
        currentUnit = units[unitIndex];
        if (currentSize < kilo || currentUnit === units[units.length - 1]) {
            break;
        } else {
            currentSize /= kilo;
            unitIndex++;
        }
    }

    return `${Math.round(currentSize * 100) / 100} ${currentUnit}`;
}

function collectImageFiles(dirname) {
    const allFiles = readdirRecursiveSync(dirname, true);
    const imageFiles = allFiles.map(f => new ImageFile(f, dirname)).filter(f => f.isValid);

    const imageSizeInTotal = imageFiles.reduce((t, c) => t + c.size, 0);

    console.log(`found ${imageFiles.length} image files (${supportedExtensions.join(', ')})`);
    console.log(`disk usage ${formatFileSize(imageSizeInTotal)}`);

    return { imageFiles, imageSizeInTotal };
}

function replaceImageFiles(imageFiles, sourceRootDir, targetRootDir) {
    for (let imageFile of imageFiles) {
        let sourcePath = path.resolve(path.join(sourceRootDir, imageFile.relPath));
        let targetPath = path.resolve(path.join(targetRootDir, imageFile.relPath));

        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }

        fs.renameSync(sourcePath, targetPath);
    }

    fs.rmdirSync(sourceRootDir, { recursive: true });
}

async function minimizeImage(imageFiles, outputDir) {
    let imageminPlugins = [imageminPngquant({ quality: [0.9, 0.9] })];
    for (let imageFile of imageFiles) {
        let targetFilepath = path.join(outputDir, imageFile.relPath);
        let targetDir = path.dirname(targetFilepath);
        await imagemin([imageFile.filepath], {
            destination: targetDir,
            plugins: imageminPlugins
        });
    }

    console.log(`image size optimization complete, processed ${imageFiles.length} images`);
}

async function optimizeImages(imageRootDir) {
    const imageSrcRootDir = imageRootDir; //'./hearts_flowers';

    let basename = path.basename(imageSrcRootDir) + '_optimized';
    let dirname = path.dirname(imageSrcRootDir);
    let imageOutRootDir = path.join(dirname, basename);

    let i = 0;
    while (fs.existsSync(imageOutRootDir)) {
        imageOutRootDir = path.join(dirname, basename + `_${++i}`);
    }

    const imageFilesRaw = collectImageFiles(imageSrcRootDir);

    await minimizeImage(imageFilesRaw.imageFiles, imageOutRootDir);
    console.log();
    replaceImageFiles(imageFilesRaw.imageFiles, imageOutRootDir, imageSrcRootDir);

    const imageFilesNew = collectImageFiles(imageSrcRootDir);
    console.log();
    console.log('summary:');
    console.log(`   discover image files: ${imageFilesRaw.imageFiles.length} (${formatFileSize(imageFilesRaw.imageSizeInTotal)})`);
    console.log(`   optimized image files: ${imageFilesNew.imageFiles.length} (${formatFileSize(imageFilesNew.imageSizeInTotal)})`);
    console.log(`   compress ratio: ${Math.round(imageFilesNew.imageSizeInTotal * 100 / imageFilesRaw.imageSizeInTotal) / 100}`);
}

module.exports = optimizeImages;