// Vice Cover Studio — cover renderer (vanilla canvas 2D, no libraries, no network).
// Draws a GTA-style multi-panel poster cover: photo panels, a procedural
// sky strip (sun, skyline, palms), a colour grade wash and a bold title band.
// Every decorative element is drawn by code; nothing here is Rockstar art.

/** Deterministic PRNG so the skyline is identical on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The three panel layouts. */
export const LAYOUTS = {
  hero: { label: 'Hero Split', panels: 3 },
  triptych: { label: 'Triptych', panels: 3 },
  corners: { label: 'Four Corners', panels: 4 },
};

/** The four colour grades: sky, wash, title gradient and accent line. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#ff9a3c', '#ff2e63', '#2b1055'],
    wash: ['rgba(255,110,60,0.20)', 'rgba(120,20,90,0.22)'],
    title: ['#ffd319', '#ff2975'],
    accent: '#ff2975',
    noir: false,
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#ff00aa', '#302b63', '#0f0c29'],
    wash: ['rgba(255,0,170,0.20)', 'rgba(0,240,255,0.18)'],
    title: ['#00f0ff', '#ff00aa'],
    accent: '#00f0ff',
    noir: false,
  },
  ocean: {
    label: 'Ocean Drive',
    sky: ['#7fffd4', '#0090ff', '#001a4d'],
    wash: ['rgba(0,200,255,0.18)', 'rgba(0,40,120,0.22)'],
    title: ['#a8ffdc', '#00bfff'],
    accent: '#00e5ff',
    noir: false,
  },
  noir: {
    label: 'Noir Gold',
    sky: ['#f5d76e', '#6b5a1e', '#111111'],
    wash: ['rgba(245,215,110,0.12)', 'rgba(0,0,0,0.30)'],
    title: ['#f5d76e', '#c9a227'],
    accent: '#f5d76e',
    noir: true,
  },
};

/** How many panels a layout holds. */
export function panelCount(layout) {
  return (LAYOUTS[layout] ?? LAYOUTS.hero).panels;
}

/** The cover's regions: outer frame, sky strip, panels area and title band. */
export function coverRegions(W, H) {
  const m = Math.max(6, Math.round(Math.min(W, H) * 0.02));
  const inner = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  const skyH = Math.round(inner.h * 0.2);
  const titleH = Math.round(inner.h * 0.17);
  const sky = { x: inner.x, y: inner.y, w: inner.w, h: skyH };
  const title = { x: inner.x, y: inner.y + inner.h - titleH, w: inner.w, h: titleH };
  const panels = { x: inner.x, y: inner.y + skyH, w: inner.w, h: inner.h - skyH - titleH };
  return { frame: inner, sky, title, panels };
}

/** The rectangles of each panel inside the panels area. */
export function panelRects(layout, W, H) {
  const { panels } = coverRegions(W, H);
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.015));
  const n = panelCount(layout);
  if (layout === 'triptych') {
    const w = (panels.w - 2 * g) / 3;
    return [0, 1, 2].map((i) => ({ x: panels.x + i * (w + g), y: panels.y, w, h: panels.h }));
  }
  if (layout === 'corners') {
    const w = (panels.w - g) / 2;
    const h = (panels.h - g) / 2;
    return [
      { x: panels.x, y: panels.y, w, h },
      { x: panels.x + w + g, y: panels.y, w, h },
      { x: panels.x, y: panels.y + h + g, w, h },
      { x: panels.x + w + g, y: panels.y + h + g, w, h },
    ];
  }
  // Hero Split: big panel left (62%), two stacked right.
  const heroW = Math.round(panels.w * 0.62);
  const sideW = panels.w - heroW - g;
  const sideH = (panels.h - g) / 2;
  return [
    { x: panels.x, y: panels.y, w: heroW, h: panels.h },
    { x: panels.x + heroW + g, y: panels.y, w: sideW, h: sideH },
    { x: panels.x + heroW + g, y: panels.y + sideH + g, w: sideW, h: sideH },
  ].slice(0, n);
}

/** Clamp a panel's pan so its photo always covers its rectangle. */
export function clampPan(panel, rect) {
  if (!panel.img) return;
  const iw = panel.img.naturalWidth;
  const ih = panel.img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const maxOx = Math.max(0, (iw * scale - rect.w) / 2);
  const maxOy = Math.max(0, (ih * scale - rect.h) / 2);
  panel.ox = Math.max(-maxOx, Math.min(maxOx, panel.ox || 0));
  panel.oy = Math.max(-maxOy, Math.min(maxOy, panel.oy || 0));
}

/** Draw one photo into its panel, cover-fit with the panel's zoom and pan. */
function drawPhoto(ctx, img, rect, panel, noir) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0);
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (noir) ctx.filter = 'grayscale(1) contrast(1.08)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** A gradient wash over a photo, soft-light so detail survives. */
function drawWash(ctx, rect, grade) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, grade.wash[0]);
  grad.addColorStop(1, grade.wash[1]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Darkened corners so the panels read as photographs, not flat tiles. */
function drawVignette(ctx, rect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.max(rect.w, rect.h) * 0.72;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** The sun disc: a radial-gradient circle with a soft glow. */
function drawSun(ctx, x, y, r, grade) {
  const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.45, grade.title[0]);
  grad.addColorStop(1, 'rgba(255,80,80,0)');
  ctx.save();
  ctx.shadowColor = grade.title[0];
  ctx.shadowBlur = r * 0.5;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A deterministic city skyline with lit windows along a strip's bottom edge. */
function drawSkyline(ctx, rect, seed) {
  const rnd = mulberry32(seed);
  const base = rect.y + rect.h;
  let x = rect.x;
  ctx.save();
  ctx.fillStyle = '#0a0a16';
  while (x < rect.x + rect.w) {
    const bw = rect.w * (0.04 + rnd() * 0.05);
    const bh = rect.h * (0.3 + rnd() * 0.55);
    ctx.fillRect(x, base - bh, bw, bh);
    // Aerial on some roofs.
    if (rnd() < 0.3) {
      ctx.fillRect(x + bw / 2 - 1, base - bh - rect.h * 0.12, 2, rect.h * 0.12);
    }
    // Lit windows.
    const cols = Math.max(1, Math.floor(bw / 9));
    const rows = Math.max(1, Math.floor(bh / 12));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.28) {
          ctx.fillStyle = rnd() < 0.7 ? 'rgba(255,214,120,0.9)' : 'rgba(120,240,255,0.85)';
          ctx.fillRect(x + 3 + c * 9, base - bh + 5 + r * 12, 4, 6);
          ctx.fillStyle = '#0a0a16';
        }
      }
    }
    x += bw + rect.w * 0.008;
  }
  ctx.restore();
}

/** One palm silhouette: a leaning trunk and six drooping fronds. */
function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#0a0a16';
  ctx.fillStyle = '#0a0a16';
  ctx.lineCap = 'round';
  // Trunk: a gentle curve leaning toward `lean` (-1 left, 1 right).
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * 6, -30, lean * 16, -58);
  ctx.stroke();
  // Fronds fan out from the crown, arcing up then drooping at the tips.
  const cx = lean * 16;
  const cy = -58;
  const fronds = [
    { tx: -34, ty: -6, kx: -22, ky: -22 },
    { tx: -26, ty: -26, kx: -20, ky: -34 },
    { tx: -10, ty: -34, kx: -8, ky: -40 },
    { tx: 8, ty: -32, kx: 6, ky: -38 },
    { tx: 24, ty: -22, kx: 18, ky: -32 },
    { tx: 32, ty: -4, kx: 22, ky: -18 },
  ];
  ctx.lineWidth = 2.5;
  for (const f of fronds) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + f.kx, cy + f.ky, cx + f.tx, cy + f.ty);
    ctx.stroke();
  }
  ctx.restore();
}

/** The sky strip: gradient sky, sun, skyline and two palms. */
function drawSkyStrip(ctx, rect, grade) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, grade.sky[0]);
  grad.addColorStop(0.55, grade.sky[1]);
  grad.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = rect.h * 0.52;
  drawSun(ctx, rect.x + rect.w * 0.8, rect.y + rect.h * 0.46, sunR, grade);
  drawSkyline(ctx, rect, 20261120);
  const palmH = rect.h * 0.85;
  drawPalm(ctx, rect.x + rect.w * 0.07, rect.y + rect.h, palmH / 62, -1);
  drawPalm(ctx, rect.x + rect.w * 0.93, rect.y + rect.h, palmH / 62, 1);
  // Thin neon edge under the strip.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(rect.x, rect.y + rect.h - 2, rect.w, 2);
}

/** The title band: dark band, neon edge, big gradient caption, letterspaced subtitle. */
function drawTitleBand(ctx, rect, caption, subtitle, grade) {
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(rect.x, rect.y, rect.w, 3);
  const capSize = Math.round(rect.h * 0.52);
  const text = (caption || 'VICE HEAT').toUpperCase();
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h * 0.62);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(1, grade.title[1]);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${capSize}px Anton, "Arial Black", sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = capSize * 0.08;
  ctx.shadowOffsetY = capSize * 0.03;
  ctx.lineWidth = Math.max(2, capSize * 0.07);
  ctx.strokeStyle = '#14060a';
  const cy = rect.y + rect.h * 0.36;
  ctx.strokeText(text, rect.x + rect.w / 2, cy);
  ctx.fillStyle = grad;
  ctx.fillText(text, rect.x + rect.w / 2, cy);
  ctx.restore();
  if (subtitle) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subSize = Math.max(9, Math.round(rect.h * 0.15));
    ctx.font = `${subSize}px "Archivo Black", "Arial Black", sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.35)}px`;
    } catch {
      // letterSpacing is Chrome-only; the subtitle still draws without it.
    }
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText(subtitle.toUpperCase(), rect.x + rect.w / 2, rect.y + rect.h * 0.78);
    ctx.restore();
  }
}

/**
 * Render the whole cover onto `canvas` at W x H.
 * state: { layout, grade, caption, subtitle, panels: [{img, zoom, ox, oy}] }.
 * selected: index of the panel to outline in the preview, or -1.
 */
export function renderCover(canvas, state, W, H, selected = -1) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const regions = coverRegions(W, H);
  // Poster paper.
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, W, H);
  drawSkyStrip(ctx, regions.sky, grade);
  // Panels over white gutters.
  const rects = panelRects(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.img) {
      clampPan(panel, rect);
      drawPhoto(ctx, panel.img, rect, panel, grade.noir);
      drawWash(ctx, rect, grade);
      drawVignette(ctx, rect);
    } else {
      ctx.fillStyle = '#20202c';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(12, Math.round(rect.h * 0.09))}px "Archivo Black", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.restore();
    }
    if (i === selected) {
      ctx.save();
      ctx.strokeStyle = grade.accent;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.restore();
    }
  });
  drawTitleBand(ctx, regions.title, state.caption, state.subtitle, grade);
}

/** Render the cover offscreen at w x h and return the canvas. */
export function exportCover(state, w, h) {
  const canvas = document.createElement('canvas');
  renderCover(canvas, state, w, h, -1);
  return canvas;
}
