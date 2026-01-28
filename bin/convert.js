#!/usr/bin/env node
const path = require('path');
const process = require('process');
const { processFolder } = require('../src/imageProcessor');

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: node bin/convert.js <folder>');
    process.exit(1);
  }
  const resolved = path.resolve(folder);
  console.log(`Converting images in: ${resolved}`);
  try {
    await processFolder(resolved, (p) => {
      const percent = Math.round((p.index / p.total) * 100);
      console.log(`(${p.index}/${p.total}) ${p.file} — ${p.success ? 'OK' : 'ERROR'} ${p.error ? p.error : ''}`);
    });
    console.log('Done');
  } catch (err) {
    console.error('Error:', (err && err.message) ? err.message : err);
    process.exit(2);
  }
}

if (require.main === module) main();
