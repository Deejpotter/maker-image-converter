const { registerApi } = require('../src/preload');

test('registerApi exposes api and calls ipcRenderer correctly', () => {
  const exposed = {};
  const cb = jest.fn((name, obj) => { exposed[name] = obj; });
  const ipcRenderer = {
    invoke: jest.fn().mockResolvedValue('ok'),
    send: jest.fn(),
    on: jest.fn()
  };
  const contextBridge = { exposeInMainWorld: cb };

  registerApi(contextBridge, ipcRenderer);
  expect(cb).toHaveBeenCalledWith('api', expect.any(Object));
  const api = exposed['api'];
  // selectFolder should call invoke
  api.selectFolder();
  expect(ipcRenderer.invoke).toHaveBeenCalledWith('select-folder');
  // processFolder should call send
  api.processFolder('/tmp');
  expect(ipcRenderer.send).toHaveBeenCalledWith('process-folder', '/tmp');
  api.cancelProcess();
  expect(ipcRenderer.send).toHaveBeenCalledWith('cancel-process');
  // event hooks should register listeners
  const cbfn = () => {};
  api.onProgress(cbfn);
  expect(ipcRenderer.on).toHaveBeenCalledWith('progress', expect.any(Function));
});
