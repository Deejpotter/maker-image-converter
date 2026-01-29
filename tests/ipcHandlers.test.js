const { registerIpcHandlers } = require('../src/ipcHandlers');

test('registers select-folder handler', async () => {
  const calls = {};
  const ipcMain = { handle: (name, fn) => { calls.handle = { name, fn }; }, on: jest.fn() };
  const dialog = { showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: ['C:/foo'] }) };
  registerIpcHandlers(ipcMain, {}, dialog);
  expect(calls.handle.name).toBe('select-folder');
  const res = await calls.handle.fn();
  expect(res).toBe('C:/foo');
});

test('process-folder starts a worker and forwards progress/done messages', async () => {
  const handlers = {};
  // mock fork to return a fake worker
  const fakeWorker = {
    _on: {},
    on: function (name, fn) { this._on[name] = fn; },
    send: jest.fn(),
    kill: jest.fn()
  };
  const mockFork = jest.fn(() => fakeWorker);

  const ipcMain = {
    handle: () => { },
    on: (name, fn) => { handlers[name] = fn; }
  };

  const sent = [];
  const event = { sender: { send: (k, d) => sent.push({ k, d }) } };

  registerIpcHandlers(ipcMain, {}, {}, mockFork);

  // simulate process-folder (legacy string folder path)
  handlers['process-folder'](event, 'some/folder');
  expect(mockFork).toHaveBeenCalled();
  expect(fakeWorker.send).toHaveBeenCalledWith({ type: 'start', folder: 'some/folder', command: undefined, options: undefined });

  // simulate process-folder (object payload)
  handlers['process-folder'](event, { folder: 'some/folder', command: 'overlay', options: { watermarkPath: 'x' } });
  expect(fakeWorker.send).toHaveBeenCalledWith({ type: 'start', folder: 'some/folder', command: 'overlay', options: { watermarkPath: 'x' } });

  // simulate progress message from worker
  fakeWorker._on.message({ type: 'progress', data: { index: 1, total: 1, file: 'a.png', success: true } });
  expect(sent.find(s => s.k === 'progress')).toBeTruthy();

  // simulate done message from worker
  fakeWorker._on.message({ type: 'done', data: { success: true } });
  expect(sent.find(s => s.k === 'done')).toBeTruthy();
});

test('cancel-process sends cancel to worker if present', () => {
  const handlers = {};
  const fakeWorker = { _on: {}, on: function (n, f) { this._on[n] = f; }, send: jest.fn() };
  const mockFork = jest.fn(() => fakeWorker);
  const ipcMain = { on: (name, fn) => { handlers[name] = fn; }, handle: () => { } };

  const imageProcessor = { cancel: jest.fn() };
  const sent = [];
  const event = { sender: { send: (k, d) => sent.push({ k, d }) } };

  registerIpcHandlers(ipcMain, imageProcessor, {}, mockFork);

  // start a worker
  handlers['process-folder'](event, 'some/folder');
  // cancel should forward to worker
  handlers['cancel-process'](event);
  expect(fakeWorker.send).toHaveBeenCalledWith({ type: 'cancel' });
  // also expect immediate cancelled notification
  expect(sent.find(s => s.k === 'cancelled')).toBeTruthy();
});

test('cancel-process calls imageProcessor.cancel and sends cancelled', () => {
  const handlers = {};
  const ipcMain = { on: (name, fn) => { handlers[name] = fn; }, handle: () => { } };
  const imageProcessor = { cancel: jest.fn() };
  const sent = [];
  const event = { sender: { send: (k, d) => sent.push({ k, d }) } };

  registerIpcHandlers(ipcMain, imageProcessor, {});
  handlers['cancel-process'](event);
  expect(imageProcessor.cancel).toHaveBeenCalled();
  expect(sent.find(s => s.k === 'cancelled')).toBeTruthy();
});

test('process-folder handles worker errors', () => {
  const handlers = {};
  const fakeWorker = { _on: {}, on: function (n, f) { this._on[n] = f; }, send: jest.fn(), kill: jest.fn() };
  const mockFork = jest.fn(() => fakeWorker);
  const ipcMain = { on: (name, fn) => { handlers[name] = fn; }, handle: () => { } };
  const event = { sender: { send: jest.fn() } };
  const imageProcessor = { cancel: jest.fn() };

  registerIpcHandlers(ipcMain, imageProcessor, {}, mockFork);
  handlers['process-folder'](event, 'dir');

  // simulate error message from worker
  fakeWorker._on.message({ type: 'done', data: { success: false, error: 'Fail' } });
  expect(event.sender.send).toHaveBeenCalledWith('done', { success: false, error: 'Fail' });
});

test('process-folder handles worker exit', () => {
  const handlers = {};
  const fakeWorker = { _on: {}, on: function (n, f) { this._on[n] = f; }, send: jest.fn(), kill: jest.fn() };
  const mockFork = jest.fn(() => fakeWorker);
  const ipcMain = { on: (name, fn) => { handlers[name] = fn; }, handle: () => { } };
  const event = { sender: { send: jest.fn() } };
  const imageProcessor = { cancel: jest.fn() };

  registerIpcHandlers(ipcMain, imageProcessor, {}, mockFork);
  handlers['process-folder'](event, 'dir');

  // simulate exit
  fakeWorker._on.exit(1);
  // Should not crash, and cleaned up
  handlers['cancel-process'](event);
  // no worker to send to
  expect(fakeWorker.send).toHaveBeenCalledTimes(1); // only the start call
});
