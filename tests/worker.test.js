let imageProcessor;

describe('worker', () => {
  let processMessages = [];
  const originalOn = process.on;
  const originalSend = process.send;
  const originalExit = process.exit;
  const originalListeners = process.listeners('message');

  beforeAll(() => {
    process.send = jest.fn((msg) => { processMessages.push(msg); });
    process.exit = jest.fn();
    // We mock BEFORE we require anything
    jest.mock('../src/imageProcessor', () => ({
      convertOnly: jest.fn(),
      overlayOnly: jest.fn(),
      diagonalOnly: jest.fn(),
      processFolder: jest.fn(),
      cancel: jest.fn()
    }));
  });

  afterAll(() => {
    process.send = originalSend;
    process.exit = originalExit;
    process.removeAllListeners('message');
    originalListeners.forEach(l => process.on('message', l));
  });

  beforeEach(() => {
    processMessages = [];
    jest.clearAllMocks();
    jest.resetModules();
    process.removeAllListeners('message');
    
    // REQUIRE AFTER RESET
    imageProcessor = require('../src/imageProcessor');
    require('../src/worker');
  });

  function getHandler() {
    return process.listeners('message')[0];
  }

  test('handles start message with convert command', async () => {
    const handler = getHandler();
    await handler({ type: 'start', folder: '/tmp', command: 'convert', options: { opa: 1 } });
    
    expect(imageProcessor.convertOnly).toHaveBeenCalled();
    expect(processMessages).toContainEqual({ type: 'done', data: { success: true } });
  });

  test('handles start message with overlay command', async () => {
    const handler = getHandler();
    await handler({ type: 'start', folder: '/tmp', command: 'overlay' });
    
    expect(imageProcessor.overlayOnly).toHaveBeenCalled();
  });

  test('handles start message with diagonal command', async () => {
    const handler = getHandler();
    await handler({ type: 'start', folder: '/tmp', command: 'diagonal' });
    
    expect(imageProcessor.diagonalOnly).toHaveBeenCalled();
  });

  test('handles cancel message', async () => {
    const handler = getHandler();
    await handler({ type: 'cancel' });
    
    expect(imageProcessor.cancel).toHaveBeenCalled();
    expect(processMessages).toContainEqual({ type: 'done', data: { success: false, error: 'Cancelled' } });
  });

  test('handles errors in start command', async () => {
    imageProcessor.processFolder.mockRejectedValue(new Error('Boom'));
    
    const handler = getHandler();
    await handler({ type: 'start', folder: '/tmp', command: 'full' });
    
    const doneMsg = processMessages.find(m => m.type === 'done');
    expect(doneMsg.data.success).toBe(false);
    expect(doneMsg.data.error).toContain('Boom');
  });
});
