const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const { processFolder, cancel } = require('../src/imageProcessor');

jest.setTimeout(20000);

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mic-'));
}

test('processFolder converts image to 800x800 webp', async () => {
  const dir = mkdtemp();
  const inFile = path.join(dir, 'test.png');
  // Create a 600x400 red png
  await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .png()
    .toFile(inFile);

  await processFolder(dir, () => {});

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
  const p = processFolder(dir, () => {});
  setTimeout(() => cancel(), 200);

  await expect(p).rejects.toThrow('Cancelled');
});
