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

  const options = {};
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
  let statusHtml = p.success ? '<span style="color:green">OK</span>' : `<span style="color:red">ERROR: ${p.error || 'Unknown error'}</span>`;
  el.innerHTML = `(${p.index}/${p.total}) ${p.file} — ${statusHtml}`;
  log.scrollTop = log.scrollHeight;
});

window.api.onDone((data) => {
  let message = `<div style="margin-top:10px;font-weight:bold">`;
  message += data.success ? 'Success!' : 'Failed';
  
  if (data.error) {
    // Display full error message to help user understand what went wrong
    message += `<div style="color:red;margin-top:5px;font-size:0.9em;font-family:monospace">${escapeHtml(data.error)}</div>`;
    
    // Suggest CLI as fallback for large conversions or persistent errors
    message += `<div style="color:orange;margin-top:8px;font-size:0.85em">`;
    message += `Tip: For large folders or if errors persist, use the CLI: <code style="font-family:monospace">npm run convert -- full "path/to/folder"</code>`;
    message += `</div>`;
  }
  
  message += `</div>`;
  log.innerHTML += message;
  startBtn.disabled = false;
  cancelBtn.disabled = true;
});

// Helper to escape HTML special characters for safe display in logs
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}

window.api.onCancelled((data) => {
  log.innerHTML += `<div style="margin-top:10px;color:orange">Cancelled</div>`;
  startBtn.disabled = false;
  cancelBtn.disabled = true;
});
