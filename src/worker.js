const imageProcessor = require('./imageProcessor');

// Worker process: receives messages from parent to start/cancel processing and sends progress/done messages
process.on('message', async (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'start') {
    const folder = msg.folder;
    const options = msg.options || {};
    const command = msg.command || 'full';
    
    // Log startup info for debugging
    console.error(`[Worker] Starting ${command} on folder: ${folder}`);
    
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

      console.error(`[Worker] ${command} completed successfully`);
      process.send({ type: 'done', data: { success: true } });
      // Optionally exit when done
      process.exit(0);
    } catch (err) {
      // Capture full error details including stack trace for debugging
      const errorDetails = {
        success: false,
        error: String(err),
        message: err.message,
        stack: err.stack,
        command: command,
        folder: folder
      };
      console.error(`[Worker] Error in ${command}:`, errorDetails);
      process.send({ type: 'done', data: errorDetails });
      process.exit(1);
    }
  } else if (msg.type === 'cancel') {
    try {
      console.error('[Worker] Cancel requested');
      imageProcessor.cancel();
      // let parent know cancellation was requested — worker will throw/exit if cancel is observed in processFolder
      process.send({ type: 'done', data: { success: false, error: 'Cancelled' } });
    } catch (err) {
      console.error('[Worker] Error during cancel:', err);
      process.send({ type: 'done', data: { success: false, error: String(err) } });
    }
  }
});

// Handle uncaught exceptions in the worker process
process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err);
  process.send({ type: 'done', data: { success: false, error: String(err), stack: err.stack } });
  process.exit(1);
});
