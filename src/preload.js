// Export a register function so it can be tested by passing mocked contextBridge/ipcRenderer
function registerApi(contextBridge, ipcRenderer) {
  contextBridge.exposeInMainWorld('api', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    // payload: { folder, command, options }
    processFolder: (payload) => ipcRenderer.send('process-folder', payload),
    cancelProcess: () => ipcRenderer.send('cancel-process'),
    onProgress: (cb) => ipcRenderer.on('progress', (e, data) => cb(data)),
    onDone: (cb) => ipcRenderer.on('done', (e, data) => cb(data)),
    onCancelled: (cb) => ipcRenderer.on('cancelled', (e, data) => cb(data))
  });
}

if (process.env.NODE_ENV !== 'test') {
  const { contextBridge, ipcRenderer } = require('electron');
  registerApi(contextBridge, ipcRenderer);
}

module.exports = { registerApi };