#!/usr/bin/env node
const path = require('path');
const process = require('process');
const { processFolder, convertOnly, overlayOnly, diagonalOnly, fullRun } = require('../src/imageProcessor');

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  const commands = new Set(['convert', 'overlay', 'diagonal', 'full']);
  let command = 'full';
  let folder = null;

  if (args.length === 0) return { command: null, folder: null, options };

  // If first arg is a command, shift it
  if (commands.has(args[0])) {
    command = args.shift();
  }

  // Next arg should be the folder
  folder = args.shift();

  // Remaining args are options
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--watermark') options.watermarkPath = args[++i];
    else if (a === '--watermark-opacity') options.watermarkOpacity = parseFloat(args[++i]);
    else if (a === '--dims-keyword') options.dimsKeyword = args[++i];
    else if (a === '--dims-folder') options.dimsFolder = path.resolve(args[++i]);
  }
  return { command, folder, options };
}

async function main() {
  const { command, folder, options } = parseArgs(process.argv);
  if (!command || !folder) {
    console.error('Usage: node bin/convert.js <command> <folder> [--watermark <path>] [--watermark-opacity <0-1>] [--dims-keyword <kw>] [--dims-folder <path>]');
    console.error('Commands: convert | overlay | diagonal | full (default if no command provided)');
    process.exit(1);
  }

  const resolved = path.resolve(folder);
  console.log(`${command.toUpperCase()}: ${resolved}`);

  try {
    const cb = (p) => {
      const percent = Math.round((p.index / p.total) * 100);
      const mode = p.watermarkMode ? `mode=${p.watermarkMode}` : '';
      console.log(`(${p.index}/${p.total}) ${p.file} — ${p.success ? 'OK' : 'ERROR'} ${mode} ${p.error ? p.error : ''}`);
    };

    if (command === 'convert') {
      await convertOnly(resolved, cb, options);
    } else if (command === 'overlay') {
      await overlayOnly(resolved, cb, options);
    } else if (command === 'diagonal') {
      await diagonalOnly(resolved, cb, options);
    } else { // full
      await fullRun(resolved, cb, options);
    }

    console.log('Done');
  } catch (err) {
    console.error('Error:', (err && err.message) ? err.message : err);
    process.exit(2);
  }
}

if (require.main === module) main();
