const grid = document.getElementById("grid");
const loading = document.getElementById("loading");
const downloadBtn = document.getElementById("downloadSelected");

const viewer = document.getElementById("viewer");
const viewerImg = document.getElementById("viewerImg");
const viewerClose = document.getElementById("viewerClose");
const viewerPrev = document.getElementById("viewerPrev");
const viewerNext = document.getElementById("viewerNext");
const viewerDownload = document.getElementById("viewerDownload");

let items = [];              // Dropbox items from /list
let selected = new Set();    // paths selected for ZIP
let currentIndex = null;     // index for full-screen viewer

/* -----------------------------
   Helpers
----------------------------- */

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
  return json.link || (json.result && json.result.link) || "";
}

/* -----------------------------
   Load gallery
----------------------------- */

async function loadGallery() {
  try {
    showSkeletons(9);
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok || !json.items || !json.items.length) {
      loading.textContent = "No photos uploaded yet.";
      grid.innerHTML = "";
      return;
    }

    items = json.items;
    loading.style.display = "none";
    grid.innerHTML = "";

    // Build thumbs
    items.forEach((item, index) => {
      const thumb = createThumb(item, index);
      grid.appendChild(thumb);
      // load image asynchronously
      loadThumbImage(thumb, item);
    });
  } catch (err) {
    console.error("GALLERY LOAD ERROR:", err);
    loading.textContent = "Error loading gallery.";
    grid.innerHTML = "";
  }
}

function createThumb(item, index) {
  const div = document.createElement("div");
  div.className = "thumb";
  div.dataset.path = item.path_display;
  div.dataset.index = index;

  const img = document.createElement("img");
  img.alt = item.name;
  img.className = "thumb-img";
  div.appendChild(img);

  // selection check
  const check = document.createElement("div");
  check.className = "checkmark";
  check.textContent = "✓";
  div.appendChild(check);

  // view full screen icon
  const viewIcon = document.createElement("button");
  viewIcon.className = "view-icon";
  viewIcon.type = "button";
  viewIcon.textContent = "⤢";
  div.appendChild(viewIcon);

  // click ✓ area (whole thumb) to toggle selection
  div.addEventListener("click", (e) => {
    // if clicked on view icon, ignore (handled separately)
    if (e.target === viewIcon) return;
    toggleSelect(div);
  });

  // click ⤢ to open viewer
  viewIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    openViewer(index);
  });

  return div;
}

async function loadThumbImage(thumb, item) {
  const img = thumb.querySelector("img");
  try {
    const link = await getTempLink(item.path_display);
    img.src = link;
  } catch (err) {
    console.error("Thumb image error:", err);
  }
}

/* -----------------------------
   Selection
----------------------------- */

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

/* -----------------------------
   Full-screen viewer
----------------------------- */

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
    console.error("Viewer error:", err);
  }
}

function closeViewer() {
  viewer.classList.remove("open");
  viewer.setAttribute("hidden", "true");
  viewerImg.src = "";
}

async function showViewerOffset(offset) {
  if (currentIndex === null) return;
  let nextIndex = currentIndex + offset;
  if (nextIndex < 0) nextIndex = items.length - 1;
  if (nextIndex >= items.length) nextIndex = 0;
  await openViewer(nextIndex);
}

viewerClose.addEventListener("click", closeViewer);
viewerPrev.addEventListener("click", () => showViewerOffset(-1));
viewerNext.addEventListener("click", () => showViewerOffset(1));

viewer.addEventListener("click", (e) => {
  if (e.target === viewer) closeViewer();
});

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

downloadBtn.addEventListener("click", async () => {
  const selectedArray = Array.from(selected);

  // No photos selected
  if (selectedArray.length === 0) {
    alert("Please select at least one photo.");
    return;
  }

  // EXACTLY ONE selected -> download directly (NO zip)
  if (selectedArray.length === 1) {
    try {
      const path = selectedArray[0];
      const item = items.find(it => it.path_display === path);

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

  // MULTIPLE selected → ZIP
  downloadBtn.disabled = true;
  downloadBtn.textContent = "Preparing ZIP…";

  try {
    const zip = new JSZip();
    let i = 0;

    for (const path of selectedArray) {
      i++;
      const item = items.find((it) => it.path_display === path);
      const filename = item ? item.name : `photo_${i}.jpg`;

      const link = await getTempLink(path);
      const fileRes = await fetch(link);
      const blob = await fileRes.blob();

      zip.file(filename, blob);

      // small delay to avoid iPhone Safari freezing
      await new Promise((r) => setTimeout(r, 120));
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "Marias-Birthday-Photos.zip");
  } catch (err) {
    console.error("ZIP download error:", err);
    alert("There was a problem preparing your download.");
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "⬇️ Download Selected";
  }
});


/* -----------------------------
   Init
----------------------------- */
loadGallery();
