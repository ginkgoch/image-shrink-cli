#!/usr/bin/env node

const optimizeImages = require('./lib');

var argv = process.argv.slice(2);

if (!argv || argv.length === 0) {
    console.log('optimize image (.png) files with 90% quality and rewrite to the original location');
    console.log('usage: image-shrink-cli <dirname>');
}

optimizeImages(argv[0]);