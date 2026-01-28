const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
let _abort = { aborted: false };

function log(message) {
  const time = new Date().toISOString();
  const line = `${time} - ${message}\n`;
  const logDir = path.join(process.cwd(), 'logs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'app.log'), line);
  } catch (err) {
    // ignore logging errors
    console.error('Logging error:', err);
  }
}

async function convertImage(inputPath, outputPath) {
  // Use sharp to resize into an 800x800 canvas with white background and save as webp
  await sharp(inputPath)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .webp({ quality: 80 })
    .toFile(outputPath);
}

async function processFolder(folderPath, progressCb = () => {}) {
  if (!folderPath) throw new Error('Folder path is required');
  _abort = { aborted: false };
  log(`Starting processing: ${folderPath}`);

  const files = await fs.promises.readdir(folderPath);
  const imgs = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));
  const outDir = path.join(folderPath, 'webp');
  await fs.promises.mkdir(outDir, { recursive: true });

  for (let i = 0; i < imgs.length; i++) {
    if (_abort.aborted) {
      log('Processing cancelled by user');
      throw new Error('Cancelled');
    }
    const name = imgs[i];
    const inPath = path.join(folderPath, name);
    const outPath = path.join(outDir, path.parse(name).name + '.webp');
    try {
      await convertImage(inPath, outPath);
      log(`Converted ${name} -> ${path.basename(outPath)}`);
      progressCb({ index: i + 1, total: imgs.length, file: name, success: true });
    } catch (err) {
      log(`Error converting ${name}: ${err}`);
      progressCb({ index: i + 1, total: imgs.length, file: name, success: false, error: String(err) });
    }
  }
  log('Processing completed');
}

function cancel() {
  _abort.aborted = true;
}

module.exports = { processFolder, cancel };
