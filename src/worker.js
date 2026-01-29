const imageProcessor = require('./imageProcessor');

// Worker process: receives messages from parent to start/cancel processing and sends progress/done messages
process.on('message', async (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'start') {
    const folder = msg.folder;
    const options = msg.options || {};
    const command = msg.command || 'full';
    try {
      // Delegate according to the requested command
      if (command === 'convert') {
        await imageProcessor.convertOnly(folder, (progress) => process.send({ type: 'progress', data: progress }), options);
      } else if (command === 'overlay') {
        await imageProcessor.overlayOnly(folder, (progress) => process.send({ type: 'progress', data: progress }), options);
      } else if (command === 'diagonal') {
        await imageProcessor.diagonalOnly(folder, (progress) => process.send({ type: 'progress', data: progress }), options);
      } else {
        await imageProcessor.processFolder(folder, (progress) => process.send({ type: 'progress', data: progress }), options);
      }

      process.send({ type: 'done', data: { success: true } });
      // Optionally exit when done
      process.exit(0);
    } catch (err) {
      process.send({ type: 'done', data: { success: false, error: String(err) } });
      process.exit(1);
    }
  } else if (msg.type === 'cancel') {
    try {
      imageProcessor.cancel();
      // let parent know cancellation was requested — worker will throw/exit if cancel is observed in processFolder
      process.send({ type: 'done', data: { success: false, error: 'Cancelled' } });
    } catch (err) {
      process.send({ type: 'done', data: { success: false, error: String(err) } });
    }
  }
});
