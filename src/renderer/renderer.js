const selectBtn = document.getElementById('select');
const startBtn = document.getElementById('start');
const cancelBtn = document.getElementById('cancel');
const folderSpan = document.getElementById('folder');
const log = document.getElementById('log');
const progressBar = document.getElementById('progressBar');
let selectedFolder = null;

selectBtn.addEventListener('click', async () => {
  const res = await window.api.selectFolder();
  if (res) {
    selectedFolder = res;
    folderSpan.textContent = selectedFolder;
    startBtn.disabled = false;
    log.innerHTML = '';
  }
});

startBtn.addEventListener('click', () => {
  if (!selectedFolder) return;
  startBtn.disabled = true;
  cancelBtn.disabled = false;
  log.innerHTML = '';
  progressBar.value = 0;

  const mode = document.getElementById('mode').value;
  const watermarkPath = document.getElementById('watermarkPath').value || undefined;
  const watermarkOpacity = parseFloat(document.getElementById('watermarkOpacity').value) || undefined;
  const dimsKeyword = document.getElementById('dimsKeyword').value || undefined;

  const options = { folderPath: selectedFolder };
  if (watermarkPath) options.watermarkPath = watermarkPath;
  if (typeof watermarkOpacity === 'number') options.watermarkOpacity = watermarkOpacity;
  if (dimsKeyword) options.dimsKeyword = dimsKeyword;

  console.log('Starting conversion:', { folder: selectedFolder, command: mode, options });
  window.api.processFolder({ folder: selectedFolder, command: mode, options });
});

cancelBtn.addEventListener('click', () => {
  window.api.cancelProcess();
  cancelBtn.disabled = true;
});

// Maintain per-file elements so transient updates replace previous status instead of appending new lines
const fileElements = new Map();
window.api.onProgress((p) => {
  const percent = Math.round((p.index / p.total) * 100);
  progressBar.value = percent;
  const key = `file-${p.file.replace(/[^a-z0-9_\-]/ig, '_')}`;

  let el = fileElements.get(key);
  if (!el) {
    el = document.createElement('div');
    el.id = key;
    log.appendChild(el);
    fileElements.set(key, el);
  }
  el.innerHTML = `(${p.index}/${p.total}) ${p.file} — ${p.success ? '<span style="color:green">OK</span>' : '<span style="color:red">ERROR</span>'}`;
  log.scrollTop = log.scrollHeight;
});

window.api.onDone((data) => {
  log.innerHTML += `<div style="margin-top:10px;font-weight:bold">Done — ${data.success ? 'Success' : 'Failed'} ${data.error ? (': ' + data.error) : ''}</div>`;
  startBtn.disabled = false;
  cancelBtn.disabled = true;
});

window.api.onCancelled((data) => {
  log.innerHTML += `<div style="margin-top:10px;color:orange">Cancelled</div>`;
  startBtn.disabled = false;
  cancelBtn.disabled = true;
});
