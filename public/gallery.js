/* --------------------------------------------------------
   Load gallery list from server
-------------------------------------------------------- */

const grid = document.getElementById("grid");
const loading = document.getElementById("loading");
const downloadBtn = document.getElementById("downloadSelected");

let selected = new Set(); // store selected paths

async function loadGallery() {
  try {
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok) throw new Error(json.error || "Failed to load");

    const items = json.items;

    if (!items || items.length === 0) {
      loading.textContent = "No photos uploaded yet.";
      return;
    }

    loading.style.display = "none";

    // Render thumbnails
    for (const item of items) {
      const thumb = await createThumb(item);
      grid.appendChild(thumb);
    }
  } catch (err) {
    console.error(err);
    loading.textContent = "Error loading gallery.";
  }
}

loadGallery();

/* --------------------------------------------------------
   Create a thumbnail element
-------------------------------------------------------- */
async function createThumb(item) {
  const div = document.createElement("div");
  div.className = "thumb";
  div.dataset.path = item.path_display;

  const isVideo = /\.(mp4|mov|m4v|avi)$/i.test(item.name);

  let img = document.createElement("img");

  if (isVideo) {
    // Use a placeholder icon for videos
    img.src = "video-icon.png"; // OPTIONAL: add your own icon
  } else {
    // Fetch actual temporary link
    const tmp = await getTempLink(item.path_display);

    img.src = tmp;
  }

  const check = document.createElement("div");
  check.className = "checkmark";
  check.textContent = "✓";

  div.appendChild(img);
  div.appendChild(check);

  div.addEventListener("click", () => toggleSelect(div));

  return div;
}

/* --------------------------------------------------------
   Get temporary Dropbox download/preview link
-------------------------------------------------------- */
async function getTempLink(path) {
  const res = await fetch(`/temp-link?path=${encodeURIComponent(path)}`);
  const json = await res.json();

  if (!json.ok) {
    console.error("Temp link error", json.error);
    return "";
  }

  // Supports both formats:
  return json.link || json.result?.link || "";
}

/* --------------------------------------------------------
   Select / Unselect thumbnails
-------------------------------------------------------- */
function toggleSelect(div) {
  const path = div.dataset.path;

  if (selected.has(path)) {
    selected.delete(path);
    div.classList.remove("selected");
  } else {
    selected.add(path);
    div.classList.add("selected");
  }
}

/* --------------------------------------------------------
   Download selected files
-------------------------------------------------------- */
downloadBtn.addEventListener("click", async () => {
  if (selected.size === 0) return alert("No photos selected.");

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Preparing…";

  for (const path of selected) {
    const link = await getTempLink(path);

    // Create download
    const a = document.createElement("a");
    a.href = link;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Delay for Safari
    await new Promise((r) => setTimeout(r, 220));
  }

  downloadBtn.textContent = "⬇️ Download Selected";
  downloadBtn.disabled = false;
});
