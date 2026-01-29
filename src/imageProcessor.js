const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SUPPORTED = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
// _abort now supports listeners so cancellations can notify in-flight operations
let _abort = { aborted: false, listeners: [] };

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

async function convertImage(inputPath, outputPath, options = {}, watermarkMode = 'none') {
  // Resize first into an 800x800 canvas with white background
  const resizePipeline = sharp(inputPath)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } });

  // Resolve watermark path: prefer provided, otherwise use built-in asset based on mode
  const watermarkOpacity = (typeof options.watermarkOpacity === 'number') ? options.watermarkOpacity : 0.3;
  let watermarkPath = options.watermarkPath;
  if (!watermarkPath) {
    // Use mode-specific asset: diagonal for -dims, horizontal for standard
    const assetName = watermarkMode === 'diagonal' ? 'MakerHardwareDiagonalOverlay.png' : 'MakerHardwareHorizontalOverlay.png';
    const assetPath = path.join(__dirname, '..', 'images', assetName);
    watermarkPath = fs.existsSync(assetPath) ? assetPath : path.join(__dirname, '..', 'assets', 'Maker Hardware BW trans USE FOR IMAGE WATERMARK.svg');
  }

  // If no watermarking requested or mode is none, just write the output
  if (watermarkMode === 'none') {
    await resizePipeline.webp({ quality: 80 }).toFile(outputPath);
    return;
  }

  // Get resized image buffer so we composite at final size
  const baseBuffer = await resizePipeline.png().toBuffer();
  const meta = await sharp(baseBuffer).metadata();
  const bw = meta.width;
  const bh = meta.height;

  // Build a watermark that is the SAME DIMENSIONS as the base (to avoid composite size errors)
  let watermarkCanvas;
  if (watermarkMode === 'center') {
    // Scale watermark to fill the width of the base so it fits the 800x800 output
    const targetW = bw; // full width
    const wmResized = await sharp(watermarkPath)
      .png()
      .resize({ width: targetW, withoutEnlargement: true })
      .toBuffer();

    // Create a solid black canvas with the requested global opacity, then mask it with the watermark shape.
    // This ensures the watermark's alpha is correctly scaled by the opacity value.
    const solidWithOpacity = await sharp({ create: { width: bw, height: bh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: watermarkOpacity } } })
      .png()
      .toBuffer();

    // Apply the watermark shape as a mask (dest-in) so only watermark-shaped regions retain the black color/alpha
    watermarkCanvas = await sharp(solidWithOpacity)
      .composite([{ input: wmResized, gravity: 'centre', blend: 'dest-in' }])
      .png()
      .toBuffer();
  } else if (watermarkMode === 'diagonal') {
    // Scale the pre-rotated diagonal watermark to fit the image
    // Cap scaling to avoid oversizing relative to the base image
    const maxScale = Math.max(bw, bh);
    const wmDiag = await sharp(watermarkPath)
      .png()
      .resize({ width: maxScale, height: maxScale, fit: 'inside' })
      .toBuffer();

    // Create solid black canvas with opacity and apply the watermark as a mask
    const solidWithOpacity = await sharp({ create: { width: bw, height: bh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: watermarkOpacity } } })
      .png()
      .toBuffer();

    watermarkCanvas = await sharp(solidWithOpacity)
      .composite([{ input: wmDiag, gravity: 'centre', blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  await sharp(baseBuffer)
    .composite([{ input: watermarkCanvas, gravity: 'centre', blend: 'over' }])
    .webp({ quality: 80 })
    .toFile(outputPath);
}

// Helper to decide which watermark mode should be applied to a file
function determineWatermarkMode(name, options = {}, isDimsFolder = false, folderPath = '') {
  // If a caller explicitly disables watermarking (convert-only), respect it
  if (options && options.noWatermark) return 'none';

  const base = path.parse(name).name;

  // Check if this is a dims file (either explicit or auto-detected)
  const isDimsFile = isDimsFolder || (options.dimsKeyword && name.includes(options.dimsKeyword)) || (folderPath && folderPath.toLowerCase().includes('dimensions') && name.includes('-dims'));

  // Files that end with '01' are primary images and should not be watermarked (UNLESS they are dims files)
  if (base.endsWith('01') && !isDimsFile) return 'none';

  // If the whole folder is marked as a dims folder, all files get diagonal watermark
  if (isDimsFolder) return 'diagonal';
  // If the filename contains the configured dims keyword, treat it as diagonal
  if (options.dimsKeyword && name.includes(options.dimsKeyword)) return 'diagonal';
  // Auto-detect: if folder name contains "Dimensions" and file contains "-dims", treat as diagonal
  if (folderPath && folderPath.toLowerCase().includes('dimensions') && name.includes('-dims')) return 'diagonal';
  // Default: center watermark
  return 'center';
}

// Helper to create a per-operation cancel promise that can be rejected when cancel() is called
function _makeCancelable() {
  if (!_abort.listeners) _abort.listeners = [];
  let rejectFn;
  const p = new Promise((_, rej) => { rejectFn = rej; });
  _abort.listeners.push(rejectFn);
  const cleanup = () => {
    _abort.listeners = _abort.listeners.filter(fn => fn !== rejectFn);
  };
  return { promise: p, cleanup, rejectFn };
}

async function processFolder(folderPath, progressCb = () => { }, options = {}) {
  if (!folderPath) throw new Error('Folder path is required');
  _abort = { aborted: false, listeners: [] };
  log(`Starting processing: ${folderPath}`);

  const files = await fs.promises.readdir(folderPath);
  const imgs = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));
  // Output `webp` as a sibling folder next to the input folder (e.g., parent/webp)
  const outDir = path.join(path.dirname(folderPath), 'webp');
  await fs.promises.mkdir(outDir, { recursive: true });

  const isDimsFolder = options.dimsFolder && path.resolve(folderPath) === path.resolve(options.dimsFolder);

  for (let i = 0; i < imgs.length; i++) {
    if (_abort.aborted) {
      log('Processing cancelled by user');
      throw new Error('Cancelled');
    }
    const name = imgs[i];
    const inPath = path.join(folderPath, name);
    const outPath = path.join(outDir, path.parse(name).name + '.webp');
    const watermarkMode = determineWatermarkMode(name, options, isDimsFolder, folderPath);
    try {
      // In test env, add short delay so `cancel()` called by tests reliably interrupts processing
      if (process.env.NODE_ENV === 'test') {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const cancelToken = _makeCancelable();
      // Race the convert operation against a cancellation promise so in-flight work can be interrupted
      await Promise.race([convertImage(inPath, outPath, options, watermarkMode), cancelToken.promise]);
      cancelToken.cleanup();

      log(`Converted ${name} -> ${path.basename(outPath)} (mode=${watermarkMode})`);
      progressCb({ index: i + 1, total: imgs.length, file: name, success: true, watermarkMode });
    } catch (err) {
      if (err && err.message === 'Cancelled') {
        log('Processing cancelled by user');
        throw err;
      }
      log(`Error converting ${name}: ${err} (mode=${watermarkMode})`);
      progressCb({ index: i + 1, total: imgs.length, file: name, success: false, error: String(err), watermarkMode });
    }
  }
  log('Processing completed');
}

function cancel() {
  _abort.aborted = true;
  if (_abort.listeners && _abort.listeners.length) {
    _abort.listeners.forEach(fn => fn(new Error('Cancelled')));
    _abort.listeners = [];
  }
}

async function convertOnly(folderPath, progressCb = () => { }, options = {}) {
  // Ensure watermarking is disabled for convert-only
  const localOpts = { ...options, noWatermark: true };
  // Remove watermarkPath so duplicates don't confuse callers
  if (localOpts.watermarkPath) delete localOpts.watermarkPath;
  await processFolder(folderPath, progressCb, localOpts);
}

async function overlayOnly(folderPath, progressCb = () => { }, options = {}) {
  // watermarkPath is optional; built-in watermark will be used if not provided.
  const files = await fs.promises.readdir(folderPath);
  const imgs = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));
  const outDir = path.join(path.dirname(folderPath), 'webp');
  await fs.promises.mkdir(outDir, { recursive: true });

  for (let i = 0; i < imgs.length; i++) {
    if (_abort.aborted) throw new Error('Cancelled');
    const name = imgs[i];
    const inPath = path.join(folderPath, name);
    const outPath = path.join(outDir, path.parse(name).name + '.webp');
    const base = path.parse(name).name;
    const watermarkMode = base.endsWith('01') ? 'none' : 'center';
    try {
      if (process.env.NODE_ENV === 'test') await new Promise((r) => setTimeout(r, 150));
      const cancelToken = _makeCancelable();
      await Promise.race([convertImage(inPath, outPath, options, watermarkMode), cancelToken.promise]);
      cancelToken.cleanup();
      progressCb({ index: i + 1, total: imgs.length, file: name, success: true, watermarkMode });
    } catch (err) {
      if (err && err.message === 'Cancelled') throw err;
      progressCb({ index: i + 1, total: imgs.length, file: name, success: false, error: String(err), watermarkMode });
    }
  }
}

async function diagonalOnly(folderPath, progressCb = () => { }, options = {}) {
  // watermarkPath is optional; built-in watermark will be used if not provided.
  const files = await fs.promises.readdir(folderPath);
  const imgs = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));
  const outDir = path.join(path.dirname(folderPath), 'webp');
  await fs.promises.mkdir(outDir, { recursive: true });

  const isDimsFolder = options.dimsFolder && path.resolve(folderPath) === path.resolve(options.dimsFolder);

  for (let i = 0; i < imgs.length; i++) {
    if (_abort.aborted) throw new Error('Cancelled');
    const name = imgs[i];
    const inPath = path.join(folderPath, name);
    const outPath = path.join(outDir, path.parse(name).name + '.webp');
    const watermarkMode = (isDimsFolder || (options.dimsKeyword && name.includes(options.dimsKeyword)) || (folderPath.toLowerCase().includes('dimensions') && name.includes('-dims'))) ? 'diagonal' : 'none';
    try {
      if (process.env.NODE_ENV === 'test') await new Promise((r) => setTimeout(r, 150));
      const cancelToken = _makeCancelable();
      await Promise.race([convertImage(inPath, outPath, options, watermarkMode), cancelToken.promise]);
      cancelToken.cleanup();
      progressCb({ index: i + 1, total: imgs.length, file: name, success: true, watermarkMode });
    } catch (err) {
      if (err && err.message === 'Cancelled') throw err;
      progressCb({ index: i + 1, total: imgs.length, file: name, success: false, error: String(err), watermarkMode });
    }
  }
}

async function fullRun(folderPath, progressCb = () => { }, options = {}) {
  // Delegates to processFolder which already uses the filename heuristics
  await processFolder(folderPath, progressCb, options);
}

module.exports = { processFolder, convertOnly, overlayOnly, diagonalOnly, fullRun, cancel };
