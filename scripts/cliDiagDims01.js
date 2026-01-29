const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const { execSync } = require('child_process');

(async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'mic-'));
  const src = path.join(parent, 'src'); fs.mkdirSync(src);
  const inFile = path.join(src, 'BOLT-30S-T-dims-01.png');
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inFile);
  console.log('Running CLI for -dims-01 file:');
  try {
    execSync(`node bin/convert.js diagonal "${src}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('CLI failed:', e.status || e.message);
  }
})();