// Disposable Camera button → opens camera directly
document.getElementById("cameraBtn").addEventListener("click", () => {
  document.getElementById("cameraInput").click();
});

// Normal upload button → open gallery/camera roll
document.getElementById("uploadBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

// Handle uploads
function uploadFile(file) {
  if (!file) return;

  const status = document.getElementById("status");
  status.textContent = "Uploading…";

  const formData = new FormData();
  formData.append("photo", file);
  formData.append("name", "Guest");
  formData.append("caption", "");
  formData.append("consent", "yes");

  fetch("/upload", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(json => {
      if (json.ok) {
        status.textContent = "Uploaded — thank you!";
      } else {
        status.textContent = "Upload failed: " + json.error;
      }
    })
    .catch(err => {
      status.textContent = "Error: " + err;
    });
}

// Camera-only input
document.getElementById("cameraInput").addEventListener("change", (e) => {
  uploadFile(e.target.files[0]);
});

// Gallery upload input
document.getElementById("fileInput").addEventListener("change", (e) => {
  uploadFile(e.target.files[0]);
});
