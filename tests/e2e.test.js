const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');
const { registerIpcHandlers } = require('../src/ipcHandlers');

jest.setTimeout(30000);
function mkdtemp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mic-')); }

test('e2e: renderer -> worker -> image processing (full run)', async () => {
  const dir = mkdtemp();
  // create sample images: product01 (primary), product02 (secondary), dims file
  const files = [
    { name: 'product01.png', w: 600, h: 400 },
    { name: 'product02.png', w: 600, h: 400 },
    { name: 'image-dims.png', w: 800, h: 600 }
  ];

  for (const f of files) {
    await sharp({ create: { width: f.w, height: f.h, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toFile(path.join(dir, f.name));
  }

  // Prepare a register that uses a real fork (default) and spy the messages sent to the renderer
  const handlers = {};
  const sent = [];
  const ipcMain = { handle: () => {}, on: (name, fn) => { handlers[name] = fn; } };
  const dialog = { showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: [dir] }) };

  registerIpcHandlers(ipcMain, {}, dialog);

  const event = { sender: { send: (k, d) => sent.push({ k, d }) } };

  // Start the full run (payload object with command/options so worker picks correct path)
  handlers['process-folder'](event, { folder: dir, command: 'full', options: { watermarkOpacity: 0.3, dimsKeyword: '-dims' } });

  // Wait for done message (with timeout)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('E2E run timed out')), 20000);
    const check = () => {
      const done = sent.find(s => s.k === 'done');
      if (done) {
        clearTimeout(timeout);
        resolve(done.d);
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });

  // Verify outputs exist
  const outDir = path.join(path.dirname(dir), 'webp');
  expect(fs.existsSync(outDir)).toBe(true);
  expect(fs.existsSync(path.join(outDir, 'product01.webp'))).toBe(true);
  expect(fs.existsSync(path.join(outDir, 'product02.webp'))).toBe(true);
  expect(fs.existsSync(path.join(outDir, 'image-dims.webp'))).toBe(true);
});