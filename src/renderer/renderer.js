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
  window.api.processFolder(selectedFolder);
});

cancelBtn.addEventListener('click', () => {
  window.api.cancelProcess();
  cancelBtn.disabled = true;
});

window.api.onProgress((p) => {
  const percent = Math.round((p.index / p.total) * 100);
  progressBar.value = percent;
  log.innerHTML += `<div>(${p.index}/${p.total}) ${p.file} — ${p.success ? 'OK' : 'ERROR'}</div>`;
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
