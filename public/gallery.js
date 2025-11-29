/* ---------------------------------
   ELEMENTS
---------------------------------- */
const grid = document.getElementById("grid");
const loading = document.getElementById("loading");
const downloadBtn = document.getElementById("downloadSelected");

const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewerImg");
const viewerClose = document.getElementById("viewerClose");
const viewerDownload = document.getElementById("viewerDownload");

/* State */
let items = [];
let selected = new Set();
let currentIndex = null;

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
  if (!json.ok) throw new Error(json.error || "Temp link failed");
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
      loading.textContent = "No photos uploaded yet.";
      grid.innerHTML = "";
      return;
    }

    items = json.items;
    loading.style.display = "none";
    grid.innerHTML = "";

    items.forEach((item, index) => {
      const t = createThumb(item, index);
      grid.appendChild(t);
      loadThumbImage(t, item);
    });

  } catch (err) {
    console.error("Gallery load error:", err);
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

  const check = document.createElement("div");
  check.className = "checkmark";
  check.textContent = "✓";
  div.appendChild(check);

  const viewIcon = document.createElement("button");
  viewIcon.className = "view-icon";
  viewIcon.textContent = "⤢";
  div.appendChild(viewIcon);

  div.addEventListener("click", e => {
    if (e.target === viewIcon) return;
    toggleSelect(div);
  });

  viewIcon.addEventListener("click", e => {
    e.stopPropagation();
    openViewer(index);
  });

  return div;
}

async function loadThumbImage(thumb, item) {
  try {
    const link = await getTempLink(item.path_display);
    thumb.querySelector("img").src = link;
  } catch (err) {
    console.error("Thumb error:", err);
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
   FULLSCREEN VIEWER
---------------------------------- */
async function openViewer(index) {
  currentIndex = index;
  const item = items[index];
  if (!item) return;

  const link = await getTempLink(item.path_display);
  viewerImg.src = link;

  viewer.classList.add("open");
  viewer.removeAttribute("hidden");
}

function closeViewer() {
  viewer.classList.remove("open");
  viewer.setAttribute("hidden", "true");
}

viewerClose.addEventListener("click", closeViewer);

viewer.addEventListener("click", e => {
  if (e.target === viewer) closeViewer();
});

/* SWIPE NAVIGATION */
let touchStartX = 0;

viewer.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].screenX;
});

viewer.addEventListener("touchend", async e => {
  const endX = e.changedTouches[0].screenX;
  const delta = endX - touchStartX;

  if (delta > 60) showViewerOffset(-1);
  if (delta < -60) showViewerOffset(1);
});

async function showViewerOffset(offset) {
  if (currentIndex === null) return;

  currentIndex += offset;

  if (currentIndex < 0) currentIndex = items.length - 1;
  if (currentIndex >= items.length) currentIndex = 0;

  const item = items[currentIndex];
  const link = await getTempLink(item.path_display);
  viewerImg.src = link;
}

/* DOWNLOAD FROM VIEWER */
viewerDownload.addEventListener("click", async () => {
  if (currentIndex === null) return;

  const item = items[currentIndex];
  const link = await getTempLink(item.path_display);

  const a = document.createElement("a");
  a.href = link;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

/* ---------------------------------
   DOWNLOAD SELECTED
---------------------------------- */
downloadBtn.addEventListener("click", async () => {
  const paths = Array.from(selected);

  if (paths.length === 0) {
    alert("Select at least one photo.");
    return;
  }

  if (paths.length === 1) {
    const path = paths[0];
    const item = items.find(i => i.path_display === path);

    const link = await getTempLink(path);
    const a = document.createElement("a");
    a.href = link;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  downloadBtn.disabled = true;
  downloadBtn.textContent = "Preparing ZIP…";

  const zip = new JSZip();
  let i = 0;

  for (const path of paths) {
    i++;
    const item = items.find(it => it.path_display === path);
    const filename = item ? item.name : `photo_${i}.jpg`;

    const link = await getTempLink(path);
    const fileRes = await fetch(link);
    const blob = await fileRes.blob();

    zip.file(filename, blob);

    await new Promise(r => setTimeout(r, 120));
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, "Marias-Birthday-Photos.zip");

  downloadBtn.disabled = false;
  downloadBtn.textContent = "⬇️ Download Selected";
});

/* INIT */
loadGallery();
