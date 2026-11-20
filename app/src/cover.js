'use strict';
/* Vice Cover Studio — cover renderer.
   Draws the whole cover on a canvas: a procedural Vice City backdrop
   (sky, sun, skyline, palms), the photo panels of the chosen layout,
   a colour-grade wash, a vignette and the title band with the caption.
   Everything is drawn here — no network, no outside assets. */

const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#1d0b3d', '#7b2d8b', '#ff7e3d'],
    sun: '#ffd166',
    glow: 'rgba(255, 158, 0, 0.55)',
    skyline: '#160a2e',
    window: '#ffd166',
    wash: 'rgba(255, 110, 60, 0.12)',
    band: 'rgba(16, 6, 32, 0.84)',
    caption: '#fff7e6',
    accent: '#ffb347',
  },
  neon: {
    name: 'Neon Nights',
    sky: ['#050514', '#3b1d8f', '#00c2d1'],
    sun: '#ff2fb3',
    glow: 'rgba(255, 47, 179, 0.55)',
    skyline: '#0a0620',
    window: '#7df9ff',
    wash: 'rgba(0, 229, 255, 0.10)',
    band: 'rgba(5, 5, 20, 0.85)',
    caption: '#f2f6ff',
    accent: '#00e5ff',
  },
  ocean: {
    name: 'Ocean Drive',
    sky: ['#062a33', '#0e7c86', '#f7c873'],
    sun: '#fff3b0',
    glow: 'rgba(247, 200, 115, 0.55)',
    skyline: '#07222b',
    window: '#fff3b0',
    wash: 'rgba(247, 200, 115, 0.10)',
    band: 'rgba(4, 32, 38, 0.84)',
    caption: '#fffdf5',
    accent: '#7fe3d0',
  },
  noir: {
    name: 'Noir Gold',
    sky: ['#0a0a0a', '#2e2413', '#c9a227'],
    sun: '#e8c766',
    glow: 'rgba(201, 162, 39, 0.55)',
    skyline: '#000000',
    window: '#e8c766',
    wash: 'rgba(201, 162, 39, 0.12)',
    band: 'rgba(0, 0, 0, 0.86)',
    caption: '#f5eeda',
    accent: '#d4af37',
  },
};

const LAYOUTS = {
  hero: { name: 'Hero Split', panels: 3 },
  triptych: { name: 'Triptych', panels: 3 },
  four: { name: 'Four Corners', panels: 4 },
};

const SIZES = [
  { id: '1920x1080', w: 1920, h: 1080, name: 'Wide 1920 × 1080' },
  { id: '1080x1080', w: 1080, h: 1080, name: 'Square 1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, name: 'Portrait 1080 × 1350' },
];

/* Deterministic seeded random, so the same grade always draws the same sky. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gradeSeed(gradeId) {
  let h = 0;
  for (const ch of gradeId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h || 7;
}

/* Panel rectangles for a layout, plus the title band rect. */
function panelRects(layout, W, H) {
  const mx = W * 0.035;
  const gapX = W * 0.02;
  const gapY = H * 0.02;
  const top = H * 0.16;
  const bandTop = H * 0.815;
  const bodyH = bandTop - top - H * 0.02;
  const bodyW = W - mx * 2;
  let panels = [];
  if (layout === 'hero') {
    const heroW = bodyW * 0.585;
    const rightX = mx + heroW + gapX;
    const rightW = W - mx - rightX;
    const halfH = (bodyH - gapY) / 2;
    panels = [
      { x: mx, y: top, w: heroW, h: bodyH },
      { x: rightX, y: top, w: rightW, h: halfH },
      { x: rightX, y: top + halfH + gapY, w: rightW, h: halfH },
    ];
  } else if (layout === 'triptych') {
    const w = (bodyW - gapX * 2) / 3;
    for (let i = 0; i < 3; i++) {
      panels.push({ x: mx + i * (w + gapX), y: top, w, h: bodyH });
    }
  } else {
    const w = (bodyW - gapX) / 2;
    const h = (bodyH - gapY) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        panels.push({ x: mx + c * (w + gapX), y: top + r * (h + gapY), w, h });
      }
    }
  }
  const band = { x: mx, y: bandTop, w: bodyW, h: H * 0.145 };
  return { panels, band };
}

/* A seeded skyline: buildings with lit windows, drawn as a silhouette. */
function drawSkyline(ctx, W, H, yBase, height, color, windowColor, seed) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = color;
  let x = 0;
  while (x < W) {
    const bw = W * (0.03 + rnd() * 0.05);
    const bh = height * (0.35 + rnd() * 0.65);
    ctx.fillRect(x, yBase - bh, bw, bh);
    // Lit windows on this building.
    ctx.fillStyle = windowColor;
    const cols = Math.max(1, Math.floor(bw / (W * 0.012)));
    const rows = Math.max(1, Math.floor(bh / (H * 0.02)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.45) {
          ctx.fillRect(
            x + W * 0.004 + c * (W * 0.012),
            yBase - bh + H * 0.008 + r * (H * 0.02),
            W * 0.005,
            H * 0.009,
          );
        }
      }
    }
    ctx.fillStyle = color;
    x += bw + W * 0.004;
  }
}

/* One palm silhouette, rooted at (x, y), leaning toward `lean` (-1 left, 1 right). */
function drawPalm(ctx, x, y, s, lean, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Curved trunk.
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.25, y - s * 0.55, x + lean * s * 0.42, y - s * 0.95);
  ctx.stroke();
  const tx = x + lean * s * 0.42;
  const ty = y - s * 0.95;
  // Fronds fanning out from the crown.
  ctx.lineWidth = s * 0.028;
  for (let i = 0; i < 7; i++) {
    const a = (-0.15 - i * 0.22) * lean + (lean < 0 ? Math.PI : 0);
    const fx = tx + Math.cos(a) * s * 0.55;
    const fy = ty + Math.sin(a) * s * 0.42 + s * 0.22;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * s * 0.3, ty + Math.sin(a) * s * 0.18 - s * 0.12, fx, fy);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(tx - s * 0.02, ty + s * 0.03, s * 0.035, 0, Math.PI * 2);
  ctx.arc(tx + s * 0.05, ty + s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

/* The procedural backdrop: sky, sun, stars, skyline and palms. */
function drawBackdrop(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars in the upper sky.
  const rnd = mulberry32(gradeSeed('stars'));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 60; i++) {
    const sx = rnd() * W;
    const sy = rnd() * H * 0.14;
    const r = 0.6 + rnd() * 1.4;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sun disc with a glow, high in the sky strip.
  const sunX = W * 0.8;
  const sunY = H * 0.075;
  const sunR = H * 0.052;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 3.2, sunY - sunR * 3.2, sunR * 6.4, sunR * 6.4);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Skyline strip across the top, just under the sky strip.
  drawSkyline(ctx, W, H, H * 0.16, H * 0.075, grade.skyline, grade.window, gradeSeed('top'));

  // A taller skyline behind the panels and the band, seen in the gaps
  // and faintly through the translucent band.
  drawSkyline(ctx, W, H, H * 0.97, H * 0.24, grade.skyline, grade.window, gradeSeed('low'));

  // Palms framing the top corners.
  drawPalm(ctx, W * 0.015, H * 0.165, H * 0.16, 1, grade.skyline);
  drawPalm(ctx, W * 0.985, H * 0.165, H * 0.16, -1, grade.skyline);
}

/* Draw one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/* A procedural stand-in when a panel has no photo yet. */
function drawPanelFallback(ctx, rect, grade, seed) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.sky[1]);
  g.addColorStop(1, grade.sky[0]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const rnd = mulberry32(seed);
  // A small sun and a mini skyline inside the empty panel.
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(rect.x + rect.w * 0.72, rect.y + rect.h * 0.24, rect.w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grade.skyline;
  let x = rect.x;
  while (x < rect.x + rect.w) {
    const bw = rect.w * (0.12 + rnd() * 0.2);
    const bh = rect.h * (0.25 + rnd() * 0.45);
    ctx.fillRect(x, rect.y + rect.h - bh, bw, bh);
    x += bw + rect.w * 0.02;
  }
}

/* The title band: accent rule, big caption, small subtitle. */
function drawBand(ctx, band, grade, caption, subtitle) {
  const r = Math.min(band.h * 0.12, 14);
  ctx.fillStyle = grade.band;
  ctx.beginPath();
  ctx.roundRect(band.x, band.y, band.w, band.h, r);
  ctx.fill();
  // Accent rule.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x + band.w * 0.06, band.y + band.h * 0.16, band.w * 0.12, Math.max(3, band.h * 0.035));
  // Caption.
  const capSize = band.h * 0.46;
  ctx.fillStyle = grade.caption;
  ctx.font = `${capSize}px Anton, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((caption || 'UNTITLED').toUpperCase(), band.x + band.w / 2, band.y + band.h * 0.46, band.w * 0.92);
  // Subtitle.
  if (subtitle) {
    const subSize = band.h * 0.17;
    ctx.font = `${subSize}px 'Archivo Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.28)}px`; } catch (e) { /* older canvas: no tracking */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle.toUpperCase(), band.x + band.w / 2, band.y + band.h * 0.8, band.w * 0.92);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  }
}

/* Draw the whole cover. `photos` is an array of HTMLImageElement|null,
   one per panel of the layout. `state` holds layout, grade, caption, subtitle. */
function drawCover(canvas, state, photos) {
  const size = SIZES.find((s) => s.id === state.size) || SIZES[0];
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const { panels, band } = panelRects(state.layout, W, H);

  drawBackdrop(ctx, W, H, grade);

  panels.forEach((rect, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    const img = photos && photos[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPanelPhoto(ctx, img, rect, panel.zoom || 1, panel.ox || 0, panel.oy || 0);
    } else {
      drawPanelFallback(ctx, rect, grade, gradeSeed(state.grade) + i * 101);
    }
    ctx.restore();
    // Thin frame around the panel.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = Math.max(2, W * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    // Selected-panel marker (editor only, not part of the art).
    if (state.selected === i && state.showSelection) {
      ctx.strokeStyle = grade.accent;
      ctx.lineWidth = Math.max(3, W * 0.003);
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
    }
  });

  drawBand(ctx, band, grade, state.caption, state.subtitle);

  // Grade wash, then a vignette to pull the eye to the middle.
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
