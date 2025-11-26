document.getElementById("galleryBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

function uploadFile(file) {
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
    status.textContent = json.ok ? "Uploaded — thank you!" : "Upload failed: " + json.error;
  })
  .catch(err => {
    status.textContent = "Error: " + err;
  });
}

document.getElementById("fileInput").addEventListener("change", (e) => {
  uploadFile(e.target.files[0]);
});
