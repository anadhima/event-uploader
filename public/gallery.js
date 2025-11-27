async function loadGallery() {
  const grid = document.getElementById("grid");

  try {
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok) {
      grid.innerHTML = "<p>Could not load gallery.</p>";
      return;
    }

    grid.innerHTML = ""; // clear existing

    for (const item of json.items) {
      // 1: Get temporary link for each file
      const linkRes = await fetch(`/temp-link?path=${encodeURIComponent(item.path_lower)}`);
      const linkJson = await linkRes.json();

      if (!linkJson.ok) continue;

      const thumb = document.createElement("div");
      thumb.className = "thumb";

      const img = document.createElement("img");
      img.src = linkJson.link;   // <-- direct Dropbox temporary link
      img.alt = "Uploaded photo";

      thumb.appendChild(img);

      grid.appendChild(thumb);
    }
  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Error loading gallery.</p>";
  }
}

loadGallery();
