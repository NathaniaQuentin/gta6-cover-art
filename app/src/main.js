// Vice Cover Studio — editor wiring: photos, layout, grade, caption, export.
// Plain classic scripts, no libraries. Photos are read on the user's own
// machine (FileReader) or loaded from the kit's sample files under app/;
// nothing is ever uploaded anywhere.

(function () {
  const { GRADES, LAYOUTS, renderCover, renderExport } = window.VCCover;

  // One entry per panel slot: the photo (an Image or null), zoom and pan.
  function blankPanel() { return { img: null, zoom: 1, ox: 0, oy: 0 }; }

  const state = {
    layout: 'hero',
    grade: 'sunset',
    caption: 'VICE HEAT',
    subtitle: 'Leonida Nights',
    samePhoto: true,
    selected: 0,
    panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel()],
  };

  const canvas = document.getElementById('preview');
  const SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

  function panelCount() {
    return state.layout === 'corners' ? 4 : 3;
  }

  function draw() {
    renderCover(canvas, state);
    document.querySelectorAll('.panel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === state.selected);
      dot.disabled = i >= panelCount();
    });
    const p = state.panels[state.selected];
    document.getElementById('zoom').value = Math.round((p.zoom - 0.6) / 2.4 * 100);
    document.getElementById('zoomLabel').textContent = p.zoom.toFixed(2) + 'x';
  }

  function loadImage(src, done) {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  }

  function applyPhoto(img) {
    if (!img) return;
    if (state.samePhoto) {
      for (let i = 0; i < panelCount(); i++) {
        state.panels[i].img = img;
        state.panels[i].zoom = 1; state.panels[i].ox = 0; state.panels[i].oy = 0;
      }
    } else {
      const p = state.panels[state.selected];
      p.img = img; p.zoom = 1; p.ox = 0; p.oy = 0;
    }
    draw();
  }

  // Photo upload from the user's machine.
  document.getElementById('upload').addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result, applyPhoto);
    reader.readAsDataURL(file);
    ev.target.value = '';
  });

  // Kit sample photos (made with an image model for make.fun, free to use).
  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadImage(SAMPLES[btn.dataset.sample], applyPhoto);
    });
  });

  document.getElementById('samePhoto').addEventListener('change', (ev) => {
    state.samePhoto = ev.target.checked;
    if (state.samePhoto) {
      const first = state.panels.find((p) => p.img);
      if (first) {
        for (let i = 0; i < panelCount(); i++) {
          state.panels[i].img = first.img;
          state.panels[i].zoom = 1; state.panels[i].ox = 0; state.panels[i].oy = 0;
        }
      }
    }
    draw();
  });

  // Layout and grade pickers.
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      state.selected = 0;
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === btn));
      draw();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
      draw();
    });
  });

  // Caption and subtitle, live as you type.
  document.getElementById('caption').addEventListener('input', (ev) => {
    state.caption = ev.target.value;
    draw();
  });
  document.getElementById('subtitle').addEventListener('input', (ev) => {
    state.subtitle = ev.target.value;
    draw();
  });

  // Panel picker dots under the preview.
  document.querySelectorAll('.panel-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => {
      if (i >= panelCount()) return;
      state.selected = i;
      draw();
    });
  });

  // Zoom slider and Centre button.
  document.getElementById('zoom').addEventListener('input', (ev) => {
    const p = state.panels[state.selected];
    p.zoom = 0.6 + (Number(ev.target.value) / 100) * 2.4;
    draw();
  });
  document.getElementById('centre').addEventListener('click', () => {
    const p = state.panels[state.selected];
    p.zoom = 1; p.ox = 0; p.oy = 0;
    draw();
  });

  // Drag to pan the selected panel's photo; wheel to zoom it.
  let dragging = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const p = state.panels[state.selected];
    if (!p.img) return;
    dragging = { x: ev.clientX, y: ev.clientY, ox: p.ox, oy: p.oy };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const p = state.panels[state.selected];
    p.ox = dragging.ox + (ev.clientX - dragging.x) / rect.width;
    p.oy = dragging.oy + (ev.clientY - dragging.y) / rect.height;
    p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
    p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
    draw();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (ev) => {
    const p = state.panels[state.selected];
    if (!p.img) return;
    ev.preventDefault();
    p.zoom = Math.max(0.6, Math.min(3, p.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    draw();
  }, { passive: false });

  // Export: render at the chosen post size and download the PNG.
  const SIZES = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = SIZES[btn.dataset.export];
      const out = renderExport(state, w, h);
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
    });
  });

  // Staging hooks for the entry's screenshots (see shots.js).
  window.__vc = {
    state,
    draw,
    loadSample(name, done) {
      loadImage(SAMPLES[name], (img) => {
        if (img) {
          state.panels.forEach((p) => { p.img = img; p.zoom = 1; p.ox = 0; p.oy = 0; });
          state.samePhoto = true;
          draw();
        }
        if (done) done(img);
      });
    },
    setScene(scene) {
      if (scene.layout) state.layout = scene.layout;
      if (scene.grade) state.grade = scene.grade;
      if (scene.caption !== undefined) {
        state.caption = scene.caption;
        document.getElementById('caption').value = scene.caption;
      }
      if (scene.subtitle !== undefined) {
        state.subtitle = scene.subtitle;
        document.getElementById('subtitle').value = scene.subtitle;
      }
      state.selected = 0;
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
      document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
      draw();
    },
  };

  // First paint: procedural scenery in every panel until a photo is loaded.
  draw();
})();
