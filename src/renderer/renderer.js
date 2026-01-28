const selectBtn = document.getElementById('select');
const startBtn = document.getElementById('start');
const folderSpan = document.getElementById('folder');
const log = document.getElementById('log');
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
  window.api.processFolder(selectedFolder);
});

window.api.onProgress((p) => {
  log.innerHTML += `<div>(${p.index}/${p.total}) ${p.file} — ${p.success ? 'OK' : 'ERROR'}</div>`;
  log.scrollTop = log.scrollHeight;
});

window.api.onDone((data) => {
  log.innerHTML += `<div style="margin-top:10px;font-weight:bold">Done — ${data.success ? 'Success' : 'Failed'} ${data.error ? (': ' + data.error) : ''}</div>`;
  startBtn.disabled = false;
});
