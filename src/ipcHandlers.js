const path = require('path');

// registerIpcHandlers now accepts an optional `fork` function so tests can inject a mock
function registerIpcHandlers(ipcMain, imageProcessor, dialog, fork = require('child_process').fork) {
  let currentWorker = null;

  ipcMain.handle('select-folder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (res.canceled) return null;
    return res.filePaths[0];
  });

  ipcMain.on('process-folder', (event, payload) => {
    // payload may be a string folderPath (legacy) or an object { folder, command, options }
    const folderPath = (typeof payload === 'string') ? payload : (payload && payload.folder);
    const command = (typeof payload === 'object' && payload.command) ? payload.command : undefined;
    const options = (typeof payload === 'object' && payload.options) ? payload.options : undefined;

    // Start a worker process that will do the heavy lifting and send progress messages
    const workerPath = path.join(__dirname, 'worker.js');
    try {
      currentWorker = fork(workerPath, [], { env: process.env });

      currentWorker.on('message', (msg) => {
        if (msg && msg.type === 'progress') {
          event.sender.send('progress', msg.data);
        } else if (msg && msg.type === 'done') {
          event.sender.send('done', msg.data);
          // worker finished; clear reference
          currentWorker = null;
        }
      });

      currentWorker.on('exit', () => {
        currentWorker = null;
      });

      currentWorker.send({ type: 'start', folder: folderPath, command, options });
    } catch (err) {
      event.sender.send('done', { success: false, error: String(err) });
    }
  });

  ipcMain.on('cancel-process', (event) => {
    try {
      if (currentWorker && currentWorker.send) {
        currentWorker.send({ type: 'cancel' });
        // Let worker report cancellation; but also notify the sender immediately
        event.sender.send('cancelled', { ok: true });
      } else {
        // Fallback to direct cancel if no worker is present
        imageProcessor.cancel();
        event.sender.send('cancelled', { ok: true });
      }
    } catch (err) {
      event.sender.send('cancelled', { ok: false, error: String(err) });
    }
  });
}

module.exports = { registerIpcHandlers };
