/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  // load minimal HTML
  document.body.innerHTML = `
    <button id="select"></button>
    <button id="start"></button>
    <button id="cancel"></button>
    <span id="folder"></span>
    <progress id="progressBar" value="0" max="100"></progress>
    <div id="log"></div>
  `;
});

test('renderer updates UI on progress and done', async () => {
  // mock window.api
  const listeners = {};
  window.api = {
    selectFolder: jest.fn().mockResolvedValue('/tmp'),
    processFolder: jest.fn(),
    cancelProcess: jest.fn(),
    onProgress: (cb) => { listeners.progress = cb; },
    onDone: (cb) => { listeners.done = cb; },
    onCancelled: (cb) => { listeners.cancelled = cb; }
  };

  require('../src/renderer/renderer');

  const selectBtn = document.getElementById('select');
  const startBtn = document.getElementById('start');
  const cancelBtn = document.getElementById('cancel');
  const progressBar = document.getElementById('progressBar');
  const log = document.getElementById('log');

  // simulate selecting folder by clicking the select button and wait for handler to finish
  selectBtn.click();
  await Promise.resolve(); // allow the async handler to complete

  // now start should be enabled
  expect(startBtn.disabled).toBe(false);

  // simulate start click
  startBtn.click();
  expect(window.api.processFolder).toHaveBeenCalled();

  // simulate progress
  listeners.progress({ index: 1, total: 2, file: 'a.png', success: true });
  expect(progressBar.value).toBe(Math.round((1 / 2) * 100));
  expect(log.innerHTML).toContain('a.png');

  // simulate done
  listeners.done({ success: true });
  expect(startBtn.disabled).toBe(false);
  expect(cancelBtn.disabled).toBe(true);
});
