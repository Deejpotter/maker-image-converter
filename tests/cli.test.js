const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');
const sharp = require('sharp');

jest.setTimeout(20000);
function mkdtemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mic-')); }

test('cli converts images to webp', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  // create a simple 600x400 red png
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .png()
    .toFile(inFile);

  const res = child_process.spawnSync('node', ['bin/convert.js', dir], { env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
  expect(res.status).toBe(0);

  const outFile = path.join(path.dirname(dir), 'webp', 'test.webp');
  expect(fs.existsSync(outFile)).toBe(true);
});

test('cli convert does not apply watermark', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  // create a simple 600x400 grey png so center is known
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 120, g: 130, b: 140 } } })
    .png()
    .toFile(inFile);

  const res = child_process.spawnSync('node', ['bin/convert.js', 'convert', dir], { env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
  expect(res.status).toBe(0);

  const outFile = path.join(path.dirname(dir), 'webp', 'test.webp');
  expect(fs.existsSync(outFile)).toBe(true);

  const meta = await sharp(outFile).metadata();
  const outBuf = await sharp(outFile).raw().toBuffer();
  const inBuf = await sharp(inFile).resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255 } }).raw().toBuffer();
  const ch = meta.channels; const idx = ((Math.floor(meta.height / 2) * meta.width) + Math.floor(meta.width / 2)) * ch;
  // expect center pixel of output to match center pixel of resized input (no watermark)
  expect(outBuf[idx]).toBe(inBuf[idx]);
  expect(outBuf[idx + 1]).toBe(inBuf[idx + 1]);
  expect(outBuf[idx + 2]).toBe(inBuf[idx + 2]);
});

test('cli overlay applies center watermark to non-01 files', async () => {
  const dir = mkdtemp();
  const in01 = path.join(dir, 'product01.png');
  const in02 = path.join(dir, 'product02.png');
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(in01);
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(in02);

  const res = child_process.spawnSync('node', ['bin/convert.js', 'overlay', dir], { env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
  expect(res.status).toBe(0);

  const out1 = path.join(path.dirname(dir), 'webp', 'product01.webp');
  const out2 = path.join(path.dirname(dir), 'webp', 'product02.webp');
  expect(fs.existsSync(out1)).toBe(true);
  expect(fs.existsSync(out2)).toBe(true);

  const meta = await sharp(out2).metadata();
  const buf1 = await sharp(out1).raw().toBuffer();
  const buf2 = await sharp(out2).raw().toBuffer();
  const centerIdx = ((Math.floor(meta.height / 2) * meta.width) + Math.floor(meta.width / 2)) * meta.channels;
  expect(buf1[centerIdx]).toBeGreaterThanOrEqual(250);
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

test('cli diagonal applies diagonal watermark to dims files only', async () => {
  const dir = mkdtemp();
  const inDim = path.join(dir, 'image-dims.png');
  const inOther = path.join(dir, 'oth.png');
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inDim);
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(inOther);

  const res = child_process.spawnSync('node', ['bin/convert.js', 'diagonal', dir, '--dims-keyword', '-dims'], { env: { ...process.env, NODE_ENV: 'test' }, encoding: 'utf8' });
  expect(res.status).toBe(0);

  const outDim = path.join(path.dirname(dir), 'webp', 'image-dims.webp');
  const outOther = path.join(path.dirname(dir), 'webp', 'oth.webp');
  expect(fs.existsSync(outDim)).toBe(true);
  expect(fs.existsSync(outOther)).toBe(true);

  const meta = await sharp(outDim).metadata();
  const buf = await sharp(outDim).raw().toBuffer();
  let found = false;
  for (let i = 0; i < buf.length; i += meta.channels) {
    if (buf[i] < 250 || buf[i + 1] < 250 || buf[i + 2] < 250) { found = true; break; }
  }
  expect(found).toBe(true);
});
