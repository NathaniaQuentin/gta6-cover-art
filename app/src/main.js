// Vice Cover Studio — editor wiring: controls, photo panels, drag-to-pan,
// wheel zoom, live preview and PNG export. Imports the renderer (cover.js)
// and the screenshot scenes (shots.js).
import { GRADES, LAYOUTS, exportCover, panelCount, panelRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

/** The export sizes: square, portrait and wide. */
const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** One panel's photo and its crop. */
function blankPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}

/** The editor state. */
const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: 'VICE HEAT',
  subtitle: 'Leonida \u2022 2026',
  panels: [blankPanel(), blankPanel(), blankPanel()],
  selected: 0,
  hideSelection: false,
};

const preview = document.getElementById('preview');
const status = document.getElementById('status');

/** Keep the panels array the size the current layout needs. */
function fitPanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(blankPanel());
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

/** The preview canvas's pixel size from its box and the device pixel ratio. */
function previewSize() {
  const box = preview.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return { w: Math.max(320, Math.round(box.width * dpr)), h: Math.max(320, Math.round(box.height * dpr)) };
}

/** Redraw the live preview. */
function redraw() {
  const { w, h } = previewSize();
  renderCover(preview, state, w, h, state.hideSelection ? -1 : state.selected);
  syncPanelTabs();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

/** Load a kit sample photo into a panel. */
async function loadSample(name, index) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.panels[index].img = img;
  state.panels[index].zoom = 1;
  state.panels[index].ox = 0;
  state.panels[index].oy = 0;
}

/** Build the layout and grade buttons from the renderer's tables. */
function buildChoiceButtons() {
  const layoutBox = document.getElementById('layouts');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.dataset.value = key;
    b.addEventListener('click', () => {
      state.layout = key;
      fitPanels();
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('grades');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.dataset.value = key;
    b.addEventListener('click', () => {
      state.grade = key;
      redraw();
    });
    gradeBox.appendChild(b);
  }
}

/** Mark the active layout/grade buttons. */
function syncChoices() {
  for (const b of document.querySelectorAll('#layouts button')) {
    b.classList.toggle('active', b.dataset.value === state.layout);
  }
  for (const b of document.querySelectorAll('#grades button')) {
    b.classList.toggle('active', b.dataset.value === state.grade);
  }
}

/** The panel tabs: one per panel, showing which holds a photo. */
function syncPanelTabs() {
  const box = document.getElementById('panels');
  box.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = panel.img ? `Panel ${i + 1} \u2022 photo` : `Panel ${i + 1} \u2022 empty`;
    b.classList.toggle('active', i === state.selected);
    b.addEventListener('click', () => {
      state.selected = i;
      redraw();
    });
    box.appendChild(b);
  });
  const zoom = document.getElementById('zoom');
  const panel = state.panels[state.selected];
  zoom.value = String(Math.round((panel.zoom - 1) * 100));
  syncChoices();
}

/** Which panel, if any, a point on the preview canvas falls in. */
function panelAt(clientX, clientY) {
  const box = preview.getBoundingClientRect();
  const { w, h } = previewSize();
  const x = ((clientX - box.left) / box.width) * w;
  const y = ((clientY - box.top) / box.height) * h;
  const rects = panelRects(state.layout, w, h);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

/** Drag on the preview pans the selected panel's photo; wheel zooms it. */
function bindCanvas() {
  let dragging = null;
  preview.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit >= 0) {
      state.selected = hit;
      redraw();
    }
    const panel = state.panels[state.selected];
    if (!panel || !panel.img) return;
    dragging = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const box = preview.getBoundingClientRect();
    const { w } = previewSize();
    const scale = w / box.width;
    const panel = state.panels[state.selected];
    panel.ox = dragging.ox + (e.clientX - dragging.x) * scale;
    panel.oy = dragging.oy + (e.clientY - dragging.y) * scale;
    redraw();
  });
  preview.addEventListener('pointerup', () => {
    dragging = null;
  });
  preview.addEventListener('wheel', (e) => {
    const panel = state.panels[state.selected];
    if (!panel || !panel.img) return;
    e.preventDefault();
    panel.zoom = Math.max(1, Math.min(4, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    redraw();
  }, { passive: false });
}

/** Wire every control in the sidebar. */
function bindControls() {
  document.getElementById('caption').addEventListener('input', (e) => {
    state.caption = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });
  document.getElementById('zoom').addEventListener('input', (e) => {
    const panel = state.panels[state.selected];
    panel.zoom = 1 + Number(e.target.value) / 100;
    redraw();
  });
  document.getElementById('centre').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.ox = 0;
    panel.oy = 0;
    panel.zoom = 1;
    redraw();
  });
  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      const panel = state.panels[state.selected];
      panel.img = img;
      panel.zoom = 1;
      panel.ox = 0;
      panel.oy = 0;
      status.textContent = `Loaded ${file.name} into panel ${state.selected + 1}.`;
      redraw();
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
    e.target.value = '';
  });
  for (const b of document.querySelectorAll('[data-sample]')) {
    b.addEventListener('click', async () => {
      await loadSample(b.dataset.sample, state.selected);
      status.textContent = `Sample photo loaded into panel ${state.selected + 1}.`;
      redraw();
    });
  }
  document.getElementById('applyAll').addEventListener('click', () => {
    const src = state.panels[state.selected];
    if (!src.img) {
      status.textContent = 'Load a photo into the selected panel first.';
      return;
    }
    for (const panel of state.panels) {
      panel.img = src.img;
      panel.zoom = src.zoom;
      panel.ox = src.ox;
      panel.oy = src.oy;
    }
    status.textContent = 'Same photo in all panels.';
    redraw();
  });
  const sizeSelect = document.getElementById('size');
  for (const [key, def] of Object.entries(SIZES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = def.label;
    sizeSelect.appendChild(opt);
  }
  document.getElementById('export').addEventListener('click', () => {
    const size = SIZES[sizeSelect.value] ?? SIZES.wide;
    const canvas = exportCover(state, size.w, size.h);
    canvas.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed: the browser could not make the PNG.';
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      a.click();
      status.textContent = `Saved vice-cover-${size.w}x${size.h}.png (${size.w} x ${size.h}).`;
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  });
}

/** Start the editor: fonts first, then the first paint. */
async function start() {
  buildChoiceButtons();
  bindControls();
  bindCanvas();
  fitPanels();
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('20px "Archivo Black"'),
    ]);
  } catch {
    // The cover still draws with fallback fonts when the OFL files fail.
  }
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, { state, fitPanels, loadSample, redraw });
  } else {
    await loadSample('pier', 0);
    redraw();
  }
  window.addEventListener('resize', redraw);
  window.__viceReady = true;
}

start();
