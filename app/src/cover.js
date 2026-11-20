// Vice Cover Studio — procedural cover renderer (vanilla canvas 2D, no libraries).
// Every decorative element is drawn in code: gradient skies, a glowing sun,
// stars, a seeded skyline with lit windows and antennas, palm silhouettes,
// a colour-grade wash and a vignette. Photos come only from the user's own
// uploads or the kit's sample files; nothing is ever fetched from a network.

// Seeded random so a cover renders identically every time it is drawn.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Four colour grades. Each one sets the sky, the sun, the wash and the accent.
const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#2b1055', '#7597de', '#ff7e5f', '#feb47b'],
    sun: '#ffd166', glow: 'rgba(255, 209, 102, 0.55)',
    wash: 'rgba(255, 126, 95, 0.20)', accent: '#ff5e8a', stars: false,
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#050510', '#1b1b4d', '#7b2ff7', '#00e5ff'],
    sun: '#ff2e88', glow: 'rgba(255, 46, 136, 0.5)',
    wash: 'rgba(123, 47, 247, 0.22)', accent: '#00e5ff', stars: true,
  },
  ocean: {
    label: 'Ocean Drive',
    sky: ['#062a3a', '#0e6b7a', '#2ec4b6', '#f4d58d'],
    sun: '#fff3b0', glow: 'rgba(255, 243, 176, 0.5)',
    wash: 'rgba(46, 196, 182, 0.18)', accent: '#f4d58d', stars: false,
  },
  noir: {
    label: 'Noir Gold',
    sky: ['#0a0a0a', '#1c1c1c', '#3d3d3d', '#8a6d2f'],
    sun: '#d4af37', glow: 'rgba(212, 175, 55, 0.45)',
    wash: 'rgba(212, 175, 55, 0.16)', accent: '#d4af37', stars: true,
  },
};

const LAYOUTS = {
  hero: 'Hero Split',
  triptych: 'Triptych',
  corners: 'Four Corners',
};

// Panel rectangles for a layout, inside the art area (above the title band).
function panelRects(layout, w, h, band) {
  const artH = h - band;
  const gap = Math.max(4, Math.round(w * 0.006));
  if (layout === 'triptych') {
    const pw = (w - gap * 2) / 3;
    return [
      { x: 0, y: 0, w: pw, h: artH },
      { x: pw + gap, y: 0, w: pw, h: artH },
      { x: (pw + gap) * 2, y: 0, w: pw, h: artH },
    ];
  }
  if (layout === 'corners') {
    const pw = (w - gap) / 2, ph = (artH - gap) / 2;
    return [
      { x: 0, y: 0, w: pw, h: ph },
      { x: pw + gap, y: 0, w: pw, h: ph },
      { x: 0, y: ph + gap, w: pw, h: ph },
      { x: pw + gap, y: ph + gap, w: pw, h: ph },
    ];
  }
  // hero: big panel left (62%), two stacked panels right.
  const leftW = w * 0.62, rightW = w - leftW - gap, halfH = (artH - gap) / 2;
  return [
    { x: 0, y: 0, w: leftW, h: artH },
    { x: leftW + gap, y: 0, w: rightW, h: halfH },
    { x: leftW + gap, y: halfH + gap, w: rightW, h: halfH },
  ];
}

function drawSky(ctx, w, h, grade, seed) {
  const g = GRADES[grade];
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, g.sky[0]);
  grad.addColorStop(0.45, g.sky[1]);
  grad.addColorStop(0.75, g.sky[2]);
  grad.addColorStop(1, g.sky[3]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(seed);
  if (g.stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 70; i++) {
      const sx = rnd() * w, sy = rnd() * h * 0.5, r = rnd() * 1.6 + 0.4;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Glowing sun disc, low over the horizon.
  const sx = w * (0.28 + rnd() * 0.44), sy = h * 0.52, sr = Math.min(w, h) * 0.11;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 3.2);
  glow.addColorStop(0, g.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = g.sun;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
}

function drawSkyline(ctx, w, h, seed, grade) {
  const rnd = mulberry32(seed + 101);
  const base = h * 0.98, top = h * 0.55;
  let x = 0;
  ctx.fillStyle = '#0b0b18';
  while (x < w) {
    const bw = w * (0.06 + rnd() * 0.09);
    const bh = (base - top) * (0.35 + rnd() * 0.65);
    const by = base - bh;
    ctx.fillRect(x, by, bw, bh);
    // Lit windows.
    const cols = Math.max(2, Math.floor(bw / (w * 0.02)));
    const rows = Math.max(3, Math.floor(bh / (h * 0.045)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.42) {
          ctx.fillStyle = rnd() < 0.75 ? '#ffd166' : '#7df9ff';
          ctx.fillRect(x + 4 + c * (bw - 8) / cols, by + 6 + r * (bh - 10) / rows, 3, 4);
          ctx.fillStyle = '#0b0b18';
        }
      }
    }
    // Antenna on the tallest towers.
    if (bh > (base - top) * 0.8) {
      ctx.fillStyle = '#0b0b18';
      ctx.fillRect(x + bw / 2 - 1, by - h * 0.06, 2, h * 0.06);
      ctx.fillStyle = '#ff2e63';
      ctx.beginPath(); ctx.arc(x + bw / 2, by - h * 0.06, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0b18';
    }
    x += bw + w * 0.008;
  }
  // Ground strip.
  ctx.fillStyle = '#07070f';
  ctx.fillRect(0, base, w, h - base);
}

function drawPalms(ctx, w, h, seed) {
  const rnd = mulberry32(seed + 707);
  ctx.strokeStyle = '#05050c';
  ctx.fillStyle = '#05050c';
  const count = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < count; i++) {
    const px = w * (0.08 + rnd() * 0.84), py = h, th = h * (0.22 + rnd() * 0.16);
    const lean = (rnd() - 0.5) * w * 0.08;
    ctx.lineWidth = Math.max(3, w * 0.008);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + lean * 0.4, py - th * 0.6, px + lean, py - th);
    ctx.stroke();
    const tx = px + lean, ty = py - th;
    for (let f = 0; f < 7; f++) {
      const a = (-Math.PI * 0.95) + (f / 6) * Math.PI * 0.9;
      const len = w * (0.05 + rnd() * 0.035);
      ctx.lineWidth = Math.max(2, w * 0.005);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.5 + len * 0.25,
        tx + Math.cos(a) * len, ty + Math.sin(a) * len + len * 0.45,
      );
      ctx.stroke();
    }
  }
}

// One panel's scenery when it holds no photo: sky, skyline, palms.
function drawScene(ctx, rect, grade, seed) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.translate(rect.x, rect.y);
  drawSky(ctx, rect.w, rect.h, grade, seed);
  drawSkyline(ctx, rect.w, rect.h, seed, grade);
  drawPalms(ctx, rect.w, rect.h, seed);
  ctx.restore();
}

// Draw a photo cover-fit inside a panel, with zoom and pan offsets.
function drawPhoto(ctx, rect, img, zoom, ox, oy) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawTitleBand(ctx, w, h, band, caption, subtitle, grade) {
  const g = GRADES[grade];
  const y0 = h - band;
  const grad = ctx.createLinearGradient(0, y0, 0, h);
  grad.addColorStop(0, 'rgba(5,5,12,0)');
  grad.addColorStop(0.35, 'rgba(5,5,12,0.88)');
  grad.addColorStop(1, 'rgba(5,5,12,0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y0, w, band);
  // Accent rule above the caption.
  ctx.fillStyle = g.accent;
  ctx.fillRect(w * 0.06, y0 + band * 0.16, w * 0.14, Math.max(3, band * 0.03));
  const pad = w * 0.06;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  const capSize = Math.min(band * 0.42, w * 0.085);
  ctx.font = `${capSize}px Anton, 'Arial Narrow', sans-serif`;
  ctx.fillText((caption || 'VICE HEAT').toUpperCase(), pad, y0 + band * 0.62, w - pad * 2);
  if (subtitle) {
    ctx.fillStyle = g.accent;
    const subSize = Math.min(band * 0.2, w * 0.032);
    ctx.font = `${subSize}px 'Archivo Black', Arial, sans-serif`;
    ctx.fillText(subtitle.toUpperCase(), pad, y0 + band * 0.88, w - pad * 2);
  }
}

function applyWash(ctx, w, h, grade) {
  const g = GRADES[grade];
  ctx.fillStyle = g.wash;
  ctx.fillRect(0, 0, w, h);
  // Vignette: darkened corners so the panels read as one poster.
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

// Render a whole cover onto a canvas of the given size. State holds the
// layout, grade, caption, subtitle and one entry per panel {img, zoom, ox, oy}.
function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const band = Math.round(h * 0.2);
  ctx.fillStyle = '#05050c';
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h, band);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || {};
    const img = panel.img || null;
    if (img) drawPhoto(ctx, rect, img, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
    else drawScene(ctx, rect, state.grade, 11 + i * 37);
  });
  drawTitleBand(ctx, w, h, band, state.caption, state.subtitle, state.grade);
  applyWash(ctx, w, h, state.grade);
}

// Render the same cover at an export size and hand back the canvas.
function renderExport(state, ew, eh) {
  const canvas = document.createElement('canvas');
  canvas.width = ew; canvas.height = eh;
  renderCover(canvas, state);
  return canvas;
}

window.VCCover = {
  GRADES, LAYOUTS, panelRects, renderCover, renderExport,
};
