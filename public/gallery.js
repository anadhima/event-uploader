const selectedPaths = new Set();

async function loadGallery() {
  const grid = document.getElementById('grid');
  grid.innerHTML = 'Loading...';

  try {
    const res = await fetch('/list');
    const json = await res.json();
    if (!json.ok) {
      grid.textContent = 'Could not load gallery.';
      return;
    }

    grid.innerHTML = '';
    const items = json.items || [];
    for (const item of items) {
      const wrapper = document.createElement('div');
      wrapper.className = 'thumb';
      wrapper.dataset.path = item.path_lower;

      const img = document.createElement('img');
      img.alt = item.name;

      const mark = document.createElement('div');
      mark.className = 'checkmark';
      mark.textContent = '✓';

      wrapper.appendChild(img);
      wrapper.appendChild(mark);
      grid.appendChild(wrapper);

      // toggle select on click
      wrapper.addEventListener('click', () => {
        const path = wrapper.dataset.path;
        if (selectedPaths.has(path)) {
          selectedPaths.delete(path);
          wrapper.classList.remove('selected');
        } else {
          selectedPaths.add(path);
          wrapper.classList.add('selected');
        }
      });

      // fetch preview link
      try {
        const linkRes = await fetch('/temp-link?path=' + encodeURIComponent(item.path_lower));
        const linkJson = await linkRes.json();
        if (linkJson.ok) {
          img.src = linkJson.link;
        }
      } catch (e) {
        console.error(e);
      }
    }
  } catch (err) {
    console.error(err);
    grid.textContent = 'Error loading gallery.';
  }
}

async function downloadSelected() {
  if (!selectedPaths.size) {
    alert('Select at least one photo first.');
    return;
  }

  for (const path of selectedPaths) {
    try {
      const res = await fetch('/temp-link?path=' + encodeURIComponent(path));
      const json = await res.json();
      if (json.ok) {
        window.open(json.link, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  const btn = document.getElementById('downloadSelected');
  btn.addEventListener('click', downloadSelected);
});
