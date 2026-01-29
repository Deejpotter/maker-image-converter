const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processFolder } = require('../src/imageProcessor');
const os = require('os');

function mkdtemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mic-')); }

(async function () {
  const parentLow = mkdtemp();
  const dirLow = path.join(parentLow, 'src'); fs.mkdirSync(dirLow);
  const inFile = path.join(dirLow, 'sample.png');
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 200, b: 200 } } }).png().toFile(inFile);
  const wmPath = path.join(dirLow, 'wm.png');
  await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toFile(wmPath);
  await processFolder(dirLow, () => { }, { watermarkOpacity: 0.3, watermarkPath: wmPath });
  const outLow = path.join(parentLow, 'webp', 'sample.webp');

  const parentHigh = mkdtemp();
  const dirHigh = path.join(parentHigh, 'src'); fs.mkdirSync(dirHigh);
  const inFile2 = path.join(dirHigh, 'sample.png'); fs.copyFileSync(inFile, inFile2);
  const wmPath2 = path.join(dirHigh, 'wm.png'); fs.copyFileSync(wmPath, wmPath2);
  await processFolder(dirHigh, () => { }, { watermarkOpacity: 1.0, watermarkPath: wmPath2 });
  const outHigh = path.join(parentHigh, 'webp', 'sample.webp');

  const bufLow = await sharp(outLow).raw().toBuffer();
  const bufHigh = await sharp(outHigh).raw().toBuffer();
  console.log('low sum', bufLow.slice(0, 100).reduce((a, b) => a + b, 0));
  console.log('high sum', bufHigh.slice(0, 100).reduce((a, b) => a + b, 0));
  // compare center pixel
  const mlow = await sharp(outLow).metadata();
  const idx = ((Math.floor(mlow.height / 2) * mlow.width) + Math.floor(mlow.width / 2)) * mlow.channels;
  console.log('center low', bufLow[idx], bufLow[idx + 1], bufLow[idx + 2]);
  const mhigh = await sharp(outHigh).metadata();
  const buf2 = bufHigh;
  const idx2 = ((Math.floor(mhigh.height / 2) * mhigh.width) + Math.floor(mhigh.width / 2)) * mhigh.channels;
  console.log('center high', buf2[idx2], buf2[idx2 + 1], buf2[idx2 + 2]);
})();