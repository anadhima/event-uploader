async function loadGallery() {
  const grid = document.getElementById("grid");

  try {
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok) {
      grid.innerHTML = "<p>Could not load gallery.</p>";
      return;
    }

    grid.innerHTML = ""; // clear items

    for (const item of json.items) {
      // Get temporary link for each file
      const linkRes = await fetch(
        "/temp-link?path=" + encodeURIComponent(item.path_lower)
      );
      const linkJson = await linkRes.json();

      if (!linkJson.ok || !linkJson.link) continue;

      // Create thumbnail
      const thumb = document.createElement("div");
      thumb.className = "thumb";

      // Create image
      const img = document.createElement("img");
      img.src = linkJson.link;
      img.alt = item.name;

      thumb.appendChild(img);
      grid.appendChild(thumb);
    }
  } catch (err) {
    console.error(err);
    document.getElementById("grid").innerHTML =
      "<p>Error loading gallery.</p>";
  }
}

loadGallery();
