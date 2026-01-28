const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  processFolder: (folderPath) => ipcRenderer.send('process-folder', folderPath),
  cancelProcess: () => ipcRenderer.send('cancel-process'),
  onProgress: (cb) => ipcRenderer.on('progress', (e, data) => cb(data)),
  onDone: (cb) => ipcRenderer.on('done', (e, data) => cb(data)),
  onCancelled: (cb) => ipcRenderer.on('cancelled', (e, data) => cb(data))
});
