async function loadGallery() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "<p>Loading…</p>";

  try {
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok) {
      grid.innerHTML = "<p>Could not load gallery.</p>";
      return;
    }

    grid.innerHTML = "";

    for (const item of json.items) {
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      thumb.dataset.path = item.path_display;

      const img = document.createElement("img");
      img.alt = item.name;
      thumb.appendChild(img);

      const check = document.createElement("div");
      check.className = "checkmark";
      check.textContent = "✓";
      thumb.appendChild(check);

      // Make each thumb clickable to select/deselect
      thumb.addEventListener("click", () => {
        thumb.classList.toggle("selected");
      });

      grid.appendChild(thumb);

      // Now fetch the actual image URL from /temp-link
      try {
        const linkRes = await fetch(
          "/temp-link?path=" + encodeURIComponent(item.path_display)
        );
        const linkJson = await linkRes.json();
        if (linkJson.ok && linkJson.link) {
          img.src = linkJson.link;
        } else {
          console.error("No link for item", item, linkJson);
        }
      } catch (e) {
        console.error("Error getting temp link", e);
      }
    }
  } catch (err) {
    console.error("GALLERY LOAD ERROR:", err);
    grid.innerHTML =
      "<p style='color:red;text-align:center;'>Error loading gallery.</p>";
  }
}

// Download selected photos one by one
document
  .getElementById("downloadSelected")
  .addEventListener("click", async () => {
    const selected = Array.from(
      document.querySelectorAll(".thumb.selected")
    );

    if (selected.length === 0) {
      alert("Please select at least one photo.");
      return;
    }

    for (const thumb of selected) {
      const path = thumb.dataset.path;

      try {
        const res = await fetch(
          "/temp-link?path=" + encodeURIComponent(path)
        );
        const json = await res.json();
        if (!json.ok || !json.link) {
          console.error("No link for download", json);
          continue;
        }

        const a = document.createElement("a");
        a.href = json.link;
        a.download = path.split("/").pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.error("Error downloading file", e);
      }
    }
  });

// Initial load
loadGallery();
