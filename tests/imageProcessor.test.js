const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const { processFolder, cancel } = require('../src/imageProcessor');

jest.setTimeout(20000);

function mkdtemp() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mic-'));
  const src = path.join(base, 'src');
  fs.mkdirSync(src);
  return src;
}

test('processFolder converts image to 800x800 webp', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  // Create a 600x400 red png
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .png()
    .toFile(inFile);

  await processFolder(dir, () => { });

  // Output 'webp' folder should be a sibling to the input folder
  const outFile = path.join(path.dirname(dir), 'webp', 'test.webp');
  expect(fs.existsSync(outFile)).toBe(true);
  const meta = await sharp(outFile).metadata();
  expect(meta.format).toBe('webp');
  expect(meta.width).toBe(800);
  expect(meta.height).toBe(800);
});

test('processFolder cancels when cancel is called', async () => {
  const dir = mkdtemp();
  // create multiple images so processing takes a moment
  for (let i = 0; i < 4; i++) {
    const inFile = path.join(dir, `t${i}.png`);
    await sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 10 * i, g: 20 * i, b: 30 * i } } })
      .png()
      .toFile(inFile);
  }

  // Start processing and cancel shortly after
  const p = processFolder(dir, () => { });
  setTimeout(() => cancel(), 200);

  await expect(p).rejects.toThrow('Cancelled');
});

test('processFolder applies center watermark to non-primary images and not to primary image', async () => {
  const dir = mkdtemp();
  // Use built-in watermark by default; no need to create a custom watermark file
  const inFile1 = path.join(dir, 'product01.png');
  const inFile2 = path.join(dir, 'product02.png');
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .png()
    .toFile(inFile1);
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .png()
    .toFile(inFile2);

  await processFolder(dir, () => { }, { watermarkOpacity: 0.3 });

  const out1 = path.join(path.dirname(dir), 'webp', 'product01.webp');
  const out2 = path.join(path.dirname(dir), 'webp', 'product02.webp');
  const meta = await sharp(out2).metadata();
  const buf1 = await sharp(out1).raw().toBuffer();
  const buf2 = await sharp(out2).raw().toBuffer();
  const centerIdx = ((Math.floor(meta.height / 2) * meta.width) + Math.floor(meta.width / 2)) * meta.channels;

  // center pixel in out1 should be white (255)
  expect(buf1[centerIdx]).toBeGreaterThanOrEqual(250);
  expect(buf1[centerIdx + 1]).toBeGreaterThanOrEqual(250);
  expect(buf1[centerIdx + 2]).toBeGreaterThanOrEqual(250);

  // center pixel in out2 should differ from out1 (watermark changed the appearance)
  // Scan a small central region to detect any pixel change caused by the watermark
  const regionW = 50, regionH = 50;
  const imgW = meta.width, imgH = meta.height, ch = meta.channels;
  let foundDiff = false;
  for (let y = Math.floor(imgH / 2 - regionH / 2); y < Math.floor(imgH / 2 + regionH / 2); y++) {
    for (let x = Math.floor(imgW / 2 - regionW / 2); x < Math.floor(imgW / 2 + regionW / 2); x++) {
      const idx = ((y * imgW) + x) * ch;
      if (buf1[idx] !== buf2[idx] || buf1[idx + 1] !== buf2[idx + 1] || buf1[idx + 2] !== buf2[idx + 2]) { foundDiff = true; break; }
    }
    if (foundDiff) break;
  }
  expect(foundDiff).toBe(true);
});

test('processFolder applies diagonal watermark for dims files', async () => {
  const dir = mkdtemp();
  // Use built-in watermark for diagonal test
  const inFile = path.join(dir, 'image-dims.png');
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .png()
    .toFile(inFile);

  await processFolder(dir, () => { }, { watermarkOpacity: 0.3, dimsKeyword: '-dims' });

  const out = path.join(path.dirname(dir), 'webp', 'image-dims.webp');
  const meta = await sharp(out).metadata();
  const buf = await sharp(out).raw().toBuffer();
  // verify at least one pixel is not white (diagonal watermark applied)
  let found = false;
  for (let i = 0; i < buf.length; i += meta.channels) {
    if (buf[i] < 250 || buf[i + 1] < 250 || buf[i + 2] < 250) { found = true; break; }
  }
  expect(found).toBe(true);
});

test('watermark opacity influences darkness (0.3 vs 1.0) using a solid watermark', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'sample.png');
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 200, b: 200 } } }).png().toFile(inFile);

  // create a solid black watermark that will definitely darken the image when applied
  const wmPath = path.join(dir, 'wm.png');
  await sharp({ create: { width: 400, height: 400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toFile(wmPath);

  // run low opacity in its own parent dir to avoid output collisions
  const parentLow = mkdtemp();
  const dirLow = path.join(parentLow, 'src');
  fs.mkdirSync(dirLow);
  fs.copyFileSync(inFile, path.join(dirLow, 'sample.png'));
  fs.copyFileSync(wmPath, path.join(dirLow, 'wm.png'));
  await processFolder(dirLow, () => { }, { watermarkOpacity: 0.3, watermarkPath: path.join(dirLow, 'wm.png') });
  const outLow = path.join(parentLow, 'webp', 'sample.webp');

  // run high opacity in its own parent dir to avoid collisions
  const parentHigh = mkdtemp();
  const dirHigh = path.join(parentHigh, 'src');
  fs.mkdirSync(dirHigh);
  fs.copyFileSync(inFile, path.join(dirHigh, 'sample.png'));
  fs.copyFileSync(wmPath, path.join(dirHigh, 'wm.png'));
  await processFolder(dirHigh, () => { }, { watermarkOpacity: 1.0, watermarkPath: path.join(dirHigh, 'wm.png') });
  const outHigh = path.join(parentHigh, 'webp', 'sample.webp');

  const meta = await sharp(outLow).metadata();
  const bufLow = await sharp(outLow).raw().toBuffer();
  const bufHigh = await sharp(outHigh).raw().toBuffer();

  // Average luminance over a central region to detect overall darkening
  const region = 50;
  const imgW = meta.width, imgH = meta.height, ch = meta.channels;
  let sumLow = 0, sumHigh = 0, count = 0;
  for (let y = Math.floor(imgH / 2 - region / 2); y < Math.floor(imgH / 2 + region / 2); y++) {
    for (let x = Math.floor(imgW / 2 - region / 2); x < Math.floor(imgW / 2 + region / 2); x++) {
      const i = ((y * imgW) + x) * ch;
      sumLow += bufLow[i] + bufLow[i + 1] + bufLow[i + 2];
      sumHigh += bufHigh[i] + bufHigh[i + 1] + bufHigh[i + 2];
      count++;
    }
  }
  const avgLow = sumLow / count;
  const avgHigh = sumHigh / count;
  expect(avgHigh).toBeLessThan(avgLow);
});

test('convertOnly disables watermarks', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'product02.png');
  await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inFile);

  const { convertOnly } = require('../src/imageProcessor');
  await convertOnly(dir, () => { });

  const out = path.join(path.dirname(dir), 'webp', 'product02.webp');
  const buf = await sharp(out).raw().toBuffer();
  // Should be pure white (no watermark)
  expect(buf[0]).toBeGreaterThanOrEqual(250);
});

test('overlayOnly applies watermarks', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inFile);

  const { overlayOnly } = require('../src/imageProcessor');
  await overlayOnly(dir, () => { }, { watermarkOpacity: 1.0 });

  const out = path.join(path.dirname(dir), 'webp', 'test.webp');
  const buf = await sharp(out).raw().toBuffer();
  // Should have something non-white (watermark)
  let found = false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] < 250) { found = true; break; }
  }
  expect(found).toBe(true);
});

test('diagonalOnly applies diagonal watermark', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test-dims.png');
  await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inFile);

  const { diagonalOnly } = require('../src/imageProcessor');
  await diagonalOnly(dir, () => { }, { watermarkOpacity: 1.0 });

  const out = path.join(path.dirname(dir), 'webp', 'test-dims.webp');
  expect(fs.existsSync(out)).toBe(true);
});

test('fullRun delegates to processFolder', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inFile);

  const { fullRun } = require('../src/imageProcessor');
  await fullRun(dir, () => { });

  const out = path.join(path.dirname(dir), 'webp', 'test.webp');
  expect(fs.existsSync(out)).toBe(true);
});
