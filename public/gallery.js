async function loadGallery() {
  try {
    const res = await fetch("/list");
    const json = await res.json();

    if (!json.ok) throw new Error(json.error || "Failed to load");

    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    json.items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "thumb";
      div.dataset.path = item.path_display;

      const img = document.createElement("img");
      img.src = `/temp-link?path=${encodeURIComponent(item.path_display)}`;

      const check = document.createElement("div");
      check.className = "checkmark";
      check.textContent = "✓";

      div.appendChild(img);
      div.appendChild(check);
      grid.appendChild(div);

      // ENABLE CLICK TO SELECT
      div.addEventListener("click", () => {
        div.classList.toggle("selected");
      });
    });
  } catch (err) {
    console.error("GALLERY LOAD ERROR:", err);
    document.getElementById("grid").innerHTML =
      "<p style='color:red;text-align:center;'>Error loading gallery.</p>";
  }
}

// DOWNLOAD SELECTED FILES
document.getElementById("downloadSelected").addEventListener("click", async () => {
  const selected = [...document.querySelectorAll(".thumb.selected")];

  if (selected.length === 0) {
    alert("Please select at least one photo.");
    return;
  }

  for (const thumb of selected) {
    const path = thumb.dataset.path;

    const res = await fetch(`/temp-link?path=${encodeURIComponent(path)}`);
    const json = await res.json();
    if (!json.ok) continue;

    const a = document.createElement("a");
    a.href = json.link;
    a.download = path.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
});

// INITIAL LOAD
loadGallery();
