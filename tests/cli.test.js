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
