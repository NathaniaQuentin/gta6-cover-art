'use strict';
/* Vice Cover Studio — editor wiring.
   Holds the cover state, loads photos, wires every control to a live
   re-render of the canvas, and exports the finished cover as a PNG.
   Depends on cover.js (GRADES, LAYOUTS, SIZES, panelRects, drawCover). */

const SAMPLE_PHOTOS = {
  pier: 'samples/pier.jpg',
  boulevard: 'samples/boulevard.jpg',
};

const DEFAULT_STATE = {
  layout: 'hero',
  grade: 'sunset',
  caption: 'NEON HEAT',
  subtitle: 'Vice City Nights',
  size: '1920x1080',
  samePhoto: true,
  selected: 0,
  showSelection: true,
  panels: [
    { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
    { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
    { photo: 'pier', zoom: 1, ox: 0, oy: 0 },
  ],
};

const state = JSON.parse(JSON.stringify(DEFAULT_STATE));
const photoCache = {}; // photo key -> HTMLImageElement
let uploadCounter = 0;

const $ = (id) => document.getElementById(id);
const canvas = $('cover');

/* Load a photo by key ('pier', 'boulevard', or an uploaded 'upload-N'
   whose Image is already in the cache) and re-render when it arrives. */
function loadPhoto(key) {
  if (photoCache[key]) return Promise.resolve(photoCache[key]);
  const src = SAMPLE_PHOTOS[key];
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      photoCache[key] = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* The images for the current panels, in layout order. */
function currentPhotos() {
  return state.panels.map((p) => (p.photo ? photoCache[p.photo] || null : null));
}

/* Re-render the canvas from the state. */
function renderCover() {
  drawCover(canvas, state, currentPhotos());
  syncControls();
}

/* Keep the control panel in step with the state. */
function syncControls() {
  document.querySelectorAll('#layoutBtns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeBtns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizeBtns button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  if ($('caption').value !== state.caption) $('caption').value = state.caption;
  if ($('subtitle').value !== state.subtitle) $('subtitle').value = state.subtitle;
  $('samePhoto').checked = state.samePhoto;
  const panel = state.panels[state.selected];
  $('zoom').value = panel ? String(panel.zoom) : '1';
  $('zoomVal').textContent = `${Math.round((panel ? panel.zoom : 1) * 100)}%`;
  buildPanelButtons();
}

/* One button per panel, so the user can pick which panel to edit. */
function buildPanelButtons() {
  const wrap = $('panelBtns');
  const count = LAYOUTS[state.layout].panels;
  if (wrap.childElementCount === count) {
    [...wrap.children].forEach((b, i) => b.classList.toggle('active', i === state.selected));
    return;
  }
  wrap.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.classList.toggle('active', i === state.selected);
    b.addEventListener('click', () => {
      state.selected = i;
      renderCover();
    });
    wrap.appendChild(b);
  }
}

/* Grow or shrink the panels array when the layout changes. */
function fitPanelsToLayout() {
  const count = LAYOUTS[state.layout].panels;
  while (state.panels.length < count) {
    state.panels.push({ photo: state.panels[0] ? state.panels[0].photo : 'pier', zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = count;
  if (state.selected >= count) state.selected = 0;
}

/* Put a photo on the selected panel — or on every panel when
   "same photo in all panels" is on. */
function applyPhotoToPanel(key) {
  const targets = state.samePhoto ? state.panels : [state.panels[state.selected]];
  targets.forEach((p) => {
    p.photo = key;
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });
  loadPhoto(key).then(renderCover);
  renderCover();
}

/* Centre the selected panel's photo and reset its zoom. */
function centrePanel() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  renderCover();
}

/* Export the cover at its full size as a PNG download. */
function exportCoverPng() {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — the canvas is empty.');
        resolve(null);
        return;
      }
      const name = `vice-cover-${state.size}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const size = SIZES.find((s) => s.id === state.size);
      setStatus(`Exported ${name} — ${size.w} × ${size.h} PNG.`);
      resolve(blob);
    }, 'image/png');
  });
}

function setStatus(text) {
  $('status').textContent = text;
}

/* Map a pointer position on the displayed canvas back to canvas pixels. */
function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - rect.left) * (canvas.width / rect.width),
    y: (ev.clientY - rect.top) * (canvas.height / rect.height),
  };
}

/* Which panel, if any, holds a canvas point. */
function panelAt(x, y) {
  const { panels } = panelRects(state.layout, canvas.width, canvas.height);
  return panels.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

/* Drag to pan the selected panel's photo; wheel to zoom it. */
let drag = null;
canvas.addEventListener('pointerdown', (ev) => {
  const p = canvasPoint(ev);
  const hit = panelAt(p.x, p.y);
  if (hit >= 0) {
    state.selected = hit;
    const panel = state.panels[hit];
    drag = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy };
    canvas.setPointerCapture(ev.pointerId);
    renderCover();
  }
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const p = canvasPoint(ev);
  const { panels } = panelRects(state.layout, canvas.width, canvas.height);
  const rect = panels[state.selected];
  const panel = state.panels[state.selected];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (p.x - drag.x) / rect.w));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (p.y - drag.y) / rect.h));
  renderCover();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel || !panel.photo) return;
  panel.zoom = Math.max(1, Math.min(3.5, panel.zoom * Math.exp(-ev.deltaY * 0.001)));
  renderCover();
}, { passive: false });

/* Controls. */
document.querySelectorAll('#layoutBtns button').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    fitPanelsToLayout();
    renderCover();
  });
});
document.querySelectorAll('#gradeBtns button').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    renderCover();
  });
});
document.querySelectorAll('#sizeBtns button').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    renderCover();
  });
});
$('caption').addEventListener('input', () => {
  state.caption = $('caption').value;
  renderCover();
});
$('subtitle').addEventListener('input', () => {
  state.subtitle = $('subtitle').value;
  renderCover();
});
$('samePhoto').addEventListener('change', () => {
  state.samePhoto = $('samePhoto').checked;
  if (state.samePhoto) {
    const first = state.panels[0].photo;
    state.panels.forEach((p) => { p.photo = first; });
    renderCover();
  }
});
$('zoom').addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = parseFloat($('zoom').value);
  renderCover();
});
$('centreBtn').addEventListener('click', centrePanel);
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', () => applyPhotoToPanel(b.dataset.sample));
});
$('uploadBtn').addEventListener('click', () => $('upload').click());
$('upload').addEventListener('change', () => {
  const file = $('upload').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const key = `upload-${++uploadCounter}`;
    const img = new Image();
    img.onload = () => {
      photoCache[key] = img;
      applyPhotoToPanel(key);
      setStatus(`Loaded ${file.name} — it never leaves your machine.`);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  $('upload').value = '';
});
$('exportBtn').addEventListener('click', exportCoverPng);
$('resetBtn').addEventListener('click', () => {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  Object.assign(state, fresh);
  renderCover();
  setStatus('Reset to the default cover.');
});

/* Boot: wait for the fonts, load the sample photos, then render. */
const ready = (async () => {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('20px "Archivo Black"'),
      document.fonts.ready,
    ]);
  } catch (e) { /* fall back to system fonts if a font fails to load */ }
  await Promise.all(Object.keys(SAMPLE_PHOTOS).map(loadPhoto));
  renderCover();
  setStatus('Pick a layout and a grade, drop in a photo, then export your cover.');
})();

/* Handle the app exposes for screenshots and for the export check. */
window.__vc = {
  state,
  render: renderCover,
  exportPng: exportCoverPng,
  loadPhoto,
  ready,
};
