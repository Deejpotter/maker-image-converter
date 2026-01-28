const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const imageProcessor = require('./imageProcessor');

function createWindow() {
  const win = new BrowserWindow({
    width: 700,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (res.canceled) return null;
  return res.filePaths[0];
});

ipcMain.on('process-folder', async (event, folderPath) => {
  try {
    await imageProcessor.processFolder(folderPath, (progress) => {
      event.sender.send('progress', progress);
    });
    event.sender.send('done', { success: true });
  } catch (err) {
    event.sender.send('done', { success: false, error: String(err) });
  }
});

ipcMain.on('cancel-process', (event) => {
  try {
    imageProcessor.cancel();
    event.sender.send('cancelled', { ok: true });
  } catch (err) {
    event.sender.send('cancelled', { ok: false, error: String(err) });
  }
});
