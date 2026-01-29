const path = require('path');

// registerIpcHandlers now accepts an optional `fork` function so tests can inject a mock
function registerIpcHandlers(ipcMain, imageProcessor, dialog, fork = require('child_process').fork) {
  let currentWorker = null;
  let workerTimeout = null;
  const WORKER_TIMEOUT = 5 * 60 * 1000; // 5 minute timeout for worker process

  // Helper to clean up worker process and timeout
  function cleanupWorker() {
    if (workerTimeout) {
      clearTimeout(workerTimeout);
      workerTimeout = null;
    }
    if (currentWorker) {
      try {
        currentWorker.kill();
      } catch (err) {
        // ignore cleanup errors
      }
      currentWorker = null;
    }
  }

  ipcMain.handle('select-folder', async () => {
    const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (res.canceled) return null;
    return res.filePaths[0];
  });

  ipcMain.on('process-folder', (event, payload) => {
    // Clean up any previous worker before starting a new one
    cleanupWorker();

    // payload may be a string folderPath (legacy) or an object { folder, command, options }
    const folderPath = (typeof payload === 'string') ? payload : (payload && payload.folder);
    const command = (typeof payload === 'object' && payload.command) ? payload.command : undefined;
    const options = (typeof payload === 'object' && payload.options) ? payload.options : undefined;

    // Validate folderPath before starting worker
    if (!folderPath) {
      event.sender.send('done', { success: false, error: 'No folder path provided' });
      return;
    }

    // Start a worker process that will do the heavy lifting and send progress messages
    const workerPath = path.join(__dirname, 'worker.js');
    try {
      currentWorker = fork(workerPath, [], { 
        env: process.env,
        // Set worker memory limit to prevent runaway processes
        silent: false // Allow worker stderr to be visible in dev console
      });

      // Set a timeout to kill the worker if it hangs
      workerTimeout = setTimeout(() => {
        console.error('[IPC] Worker timeout after ' + (WORKER_TIMEOUT / 1000) + ' seconds');
        if (currentWorker) {
          currentWorker.kill('SIGTERM');
          event.sender.send('done', { success: false, error: 'Worker timeout - conversion took too long' });
          cleanupWorker();
        }
      }, WORKER_TIMEOUT);

      currentWorker.on('message', (msg) => {
        // Cancel the timeout when we get a done message
        if (msg && msg.type === 'done') {
          cleanupWorker();
        }
        
        if (msg && msg.type === 'progress') {
          event.sender.send('progress', msg.data);
        } else if (msg && msg.type === 'done') {
          // Include full error context if present
          const data = msg.data || {};
          event.sender.send('done', data);
          currentWorker = null;
        }
      });

      currentWorker.on('exit', (code) => {
        // Worker exited; ensure cleanup happens
        cleanupWorker();
        // Send an error message if worker exited unexpectedly (non-zero exit code)
        if (code && code !== 0) {
          event.sender.send('done', { success: false, error: `Worker process exited with code ${code}` });
        }
      });

      currentWorker.on('error', (err) => {
        // Handle worker fork/communication errors
        console.error('[IPC] Worker error:', err);
        event.sender.send('done', { success: false, error: 'Worker process error: ' + String(err) });
        cleanupWorker();
      });

      currentWorker.send({ type: 'start', folder: folderPath, command, options });
    } catch (err) {
      console.error('[IPC] Failed to start worker:', err);
      event.sender.send('done', { success: false, error: 'Failed to start processing: ' + String(err) });
      cleanupWorker();
    }
  });

  ipcMain.on('cancel-process', (event) => {
    try {
      if (currentWorker && currentWorker.send) {
        currentWorker.send({ type: 'cancel' });
        // Let worker report cancellation; but also notify the sender immediately
        event.sender.send('cancelled', { ok: true });
        // Give worker a moment to respond before killing it
        setTimeout(() => {
          cleanupWorker();
        }, 1000);
      } else {
        // Fallback to direct cancel if no worker is present
        imageProcessor.cancel();
        event.sender.send('cancelled', { ok: true });
      }
    } catch (err) {
      console.error('[IPC] Cancel error:', err);
      event.sender.send('cancelled', { ok: false, error: String(err) });
      cleanupWorker();
    }
  });
}

module.exports = { registerIpcHandlers };
