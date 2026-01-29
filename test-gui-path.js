const { processFolder } = require('./src/imageProcessor');
const path = require('path');

(async () => {
  try {
    const testFolder = 'G:\\My Drive\\Work Stuff\\Maker Store\\ProductPhotos\\30 Series\\Dimensions\\raw';
    console.log('Testing with folder:', testFolder);
    let fileCount = 0;
    await processFolder(testFolder, (p) => {
      fileCount++;
      if (!p.success) {
        console.error(`File ${p.index}: ${p.file} ERROR: ${p.error}`);
      } else {
        console.log(`File ${p.index}: ${p.file} OK`);
      }
    }, { watermarkOpacity: 0.3 });
    console.log('Done. Processed', fileCount, 'files');
  } catch (err) {
    console.error('Error:', err);
  }
})();