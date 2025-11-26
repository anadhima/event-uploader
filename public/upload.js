const form = document.getElementById('uploadForm');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Uploading...';

  try {
    const data = new FormData(form);
    const res = await fetch('/upload', { method: 'POST', body: data });
    const json = await res.json();
    if (json.ok) {
      statusEl.textContent = 'Uploaded — thank you!';
      form.reset();
    } else {
      statusEl.textContent = 'Upload failed: ' + (json.error || 'Unknown error');
    }
  } catch (err) {
    statusEl.textContent = 'Error: ' + err.message;
  }
});
