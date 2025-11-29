/* ---------------------------------
   ELEMENTS
---------------------------------- */
const grid = document.getElementById("grid");
const loading = document.getElementById("loading");
const downloadBtn = document.getElementById("downloadSelected");

/* Viewer elements */
const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewerImg");
const viewerClose = document.getElementById("viewerClose");
const viewerPrev = document.getElementById("viewerPrev");
const viewerNext = document.getElementById("viewerNext");
const viewerDownload = document.getElementById("viewerDownload");

/* State */
let items = [];           // All images from server
let selected = new Set(); // Selected for ZIP
let currentIndex = null;  // Index for full-screen viewer



/* ---------------------------------
   HELPERS
---------------------------------- */

function showSkeletons(count) {
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "thumb skeleton";
    grid.appendChild(sk);
  }
}

async function getTempLink(path) {
  const res = await fetch(`/temp-link?path=${encodeURIComponent(path)}`);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "Failed to get link");
  
  return json.link || (json.result && json.result.link);
}



/* ---------------------------------
   LOAD GALLERY
---------------------------------- */

async function loadGallery() {
  try {
    showSkeletons(9);

    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok || !json.items?.length) {
      grid.innerHTML = "";
      loading.textContent = "No photos uploaded yet.";
      return;
    }

    items = json.items;
    loading.style.display = "none";
    grid.innerHTML = "";

    items.forEach((item, index) => {
      const thumb = createThumb(item, index);
      grid.appendChild(thumb);
      loadThumbImage(thumb, item);
    });

  } catch (err) {
    console.error("GALLERY LOAD ERROR:", err);
    loading.textContent = "Error loading gallery.";
    grid.innerHTML = "";
  }
}



/* ---------------------------------
   CREATE THUMB
---------------------------------- */

function createThumb(item, index) {
  const div = document.createElement("div");
  div.className = "thumb";
  div.dataset.path = item.path_display;
  div.dataset.index = index;

  const img = document.createElement("img");
  img.className = "thumb-img";
  img.alt = item.name;
  div.appendChild(img);

  /* ✓ Selection checkmark */
  const check = document.createElement("div");
  check.className = "checkmark";
  check.textContent = "✓";
  div.appendChild(check);

  /* ⤢ Fullscreen icon */
  const viewIcon = document.createElement("button");
  viewIcon.className = "view-icon";
  viewIcon.textContent = "⤢";
  div.appendChild(viewIcon);

  /* Tap to select */
  div.addEventListener("click", (e) => {
    if (e.target === viewIcon) return; // ignore when clicking ⤢
    toggleSelect(div);
  });

  /* Tap ⤢ to open viewer */
  viewIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    openViewer(index);
  });

  return div;
}



/* ---------------------------------
   LOAD THUMB IMAGE
---------------------------------- */

async function loadThumbImage(thumb, item) {
  const img = thumb.querySelector("img");
  try {
    const link = await getTempLink(item.path_display);
    img.src = link;
  } catch (err) {
    console.error("THUMB LOAD ERROR:", err);
  }
}



/* ---------------------------------
   SELECTION
---------------------------------- */

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



/* ---------------------------------
   FULL-SCREEN VIEWER
---------------------------------- */

async function openViewer(index) {
  currentIndex = index;

  const item = items[index];
  if (!item) return;

  try {
    const link = await getTempLink(item.path_display);
    viewerImg.src = link;

    viewer.classList.add("open");
    viewer.removeAttribute("hidden");
  } catch (err) {
    console.error("VIEWER ERROR:", err);
  }
}
/* ============================================
   SWIPE TO CHANGE PHOTOS
============================================ */

let touchStartX = 0;

viewer.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

viewer.addEventListener("touchend", (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  const dist = touchEndX - touchStartX;

  // Swipe right → previous photo
  if (dist > 60) {
    showViewerOffset(-1);
  }

  // Swipe left → next photo
  if (dist < -60) {
    showViewerOffset(1);
  }
});


function closeViewer() {
  viewer.classList.remove("open");
  viewer.setAttribute("hidden", "true");
  viewerImg.src = "";
}

viewerClose.addEventListener("click", closeViewer);

viewer.addEventListener("click", (e) => {
  if (e.target === viewer) closeViewer();
});

/* Navigate inside viewer */
async function showViewerOffset(offset) {
  if (currentIndex === null) return;

  currentIndex = currentIndex + offset;

  if (currentIndex < 0) currentIndex = items.length - 1;
  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  const link = await getTempLink(item.path_display);
  viewerImg.src = link;
}

viewerPrev.addEventListener("click", () => showViewerOffset(-1));
viewerNext.addEventListener("click", () => showViewerOffset(1));

/* Single download from viewer */
viewerDownload.addEventListener("click", async () => {
  if (currentIndex === null) return;

  const item = items[currentIndex];
  try {
    const link = await getTempLink(item.path_display);

    const a = document.createElement("a");
    a.href = link;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    a.remove();

  } catch (err) {
    console.error("Viewer download error:", err);
  }
});



/* ---------------------------------
   DOWNLOAD SELECTED
---------------------------------- */

downloadBtn.addEventListener("click", async () => {
  const chosen = Array.from(selected);

  if (chosen.length === 0) {
    alert("Please select at least one photo.");
    return;
  }

  /* --- Direct image download (single) --- */
  if (chosen.length === 1) {
    const path = chosen[0];
    const item = items.find(it => it.path_display === path);

    try {
      const link = await getTempLink(path);

      const a = document.createElement("a");
      a.href = link;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;

    } catch (err) {
      console.error("Single download error:", err);
      alert("Could not download the image.");
      return;
    }
  }

  /* --- ZIP Download (multiple) --- */
  downloadBtn.disabled = true;
  downloadBtn.textContent = "Preparing ZIP…";

  try {
    const zip = new JSZip();
    let i = 0;

    for (const path of chosen) {
      i++;
      const item = items.find(it => it.path_display === path);
      const filename = item ? item.name : `photo_${i}.jpg`;

      const link = await getTempLink(path);
      const fileRes = await fetch(link);
      const blob = await fileRes.blob();

      zip.file(filename, blob);

      await new Promise(r => setTimeout(r, 120)); // keep Safari from freezing
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "Marias-Birthday-Photos.zip");

  } catch (err) {
    console.error("ZIP error:", err);
    alert("There was a problem preparing your download.");
  }

  downloadBtn.disabled = false;
  downloadBtn.textContent = "⬇️ Download Selected";
});



/* ---------------------------------
   INIT
---------------------------------- */
loadGallery();
