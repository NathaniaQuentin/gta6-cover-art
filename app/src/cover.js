// Vice Cover Studio — procedural cover renderer (vanilla canvas 2D, no libraries).
// Every decorative element is drawn in code: gradient skies, a glowing sun,
// a seeded skyline with lit windows, palm silhouettes, a grade wash and a
// vignette. Photos come only from the user's own uploads or the kit samples.

(function () {
  'use strict';

  // Seeded PRNG so a given seed always draws the same skyline.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GRADES = {
    viceSunset: {
      sky: ['#1b0b3b', '#7b2d8b', '#ff7e3d'],
      sun: '#ffd166', sunCore: '#fff3c4', wash: 'rgba(255,110,60,0.16)',
      band: 'rgba(12,6,28,0.85)', accent: '#ffd166'
    },
    neonNights: {
      sky: ['#050514', '#14124a', '#b537f2'],
      sun: '#ff2e88', sunCore: '#ffd7ef', wash: 'rgba(120,60,255,0.20)',
      band: 'rgba(8,4,26,0.85)', accent: '#ff2e88'
    },
    oceanDrive: {
      sky: ['#062a3a', '#0e6b7a', '#f2a65a'],
      sun: '#ffe08a', sunCore: '#fffbe8', wash: 'rgba(20,140,160,0.14)',
      band: 'rgba(4,22,30,0.85)', accent: '#ffe08a'
    },
    noirGold: {
      sky: ['#0d0d0d', '#232323', '#8a6d2b'],
      sun: '#f5c542', sunCore: '#fff6d8', wash: 'rgba(245,197,66,0.10)',
      band: 'rgba(8,8,8,0.88)', accent: '#f5c542'
    }
  };

  function layoutPanels(layout, w, h) {
    var gap = Math.max(4, Math.round(w * 0.008));
    if (layout === 'triptych') {
      var cw = (w - gap * 2) / 3;
      return [
        { x: 0, y: 0, w: cw, h: h },
        { x: cw + gap, y: 0, w: cw, h: h },
        { x: (cw + gap) * 2, y: 0, w: cw, h: h }
      ];
    }
    if (layout === 'four') {
      var hw = (w - gap) / 2, hh = (h - gap) / 2;
      return [
        { x: 0, y: 0, w: hw, h: hh },
        { x: hw + gap, y: 0, w: hw, h: hh },
        { x: 0, y: hh + gap, w: hw, h: hh },
        { x: hw + gap, y: hh + gap, w: hw, h: hh }
      ];
    }
    // hero: one wide panel left, two stacked on the right.
    var heroW = Math.round(w * 0.62);
    var sideW = w - heroW - gap;
    var sideH = (h - gap) / 2;
    return [
      { x: 0, y: 0, w: heroW, h: h },
      { x: heroW + gap, y: 0, w: sideW, h: sideH },
      { x: heroW + gap, y: sideH + gap, w: sideW, h: sideH }
    ];
  }

  function drawSky(ctx, r, g, rnd) {
    var grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    grad.addColorStop(0, g.sky[0]);
    grad.addColorStop(0.55, g.sky[1]);
    grad.addColorStop(1, g.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    // Stars in the upper half.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    var n = Math.floor(r.w * r.h / 26000);
    for (var i = 0; i < n; i++) {
      var sx = r.x + rnd() * r.w, sy = r.y + rnd() * r.h * 0.45;
      var s = rnd() < 0.85 ? 1 : 2;
      ctx.globalAlpha = 0.35 + rnd() * 0.6;
      ctx.fillRect(sx, sy, s, s);
    }
    ctx.globalAlpha = 1;
    // Sun disc with a soft glow.
    var cx = r.x + r.w * 0.68, cy = r.y + r.h * 0.34;
    var rad = Math.min(r.w, r.h) * 0.16;
    var glow = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 2.4);
    glow.addColorStop(0, g.sun);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glow;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g.sunCore;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.sun;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 0.82, 0, Math.PI * 2); ctx.fill();
  }

  function drawSkyline(ctx, r, rnd) {
    var base = r.y + r.h;
    var x = r.x;
    while (x < r.x + r.w) {
      var bw = 14 + rnd() * (r.w * 0.09);
      var bh = r.h * (0.18 + rnd() * 0.38);
      ctx.fillStyle = 'rgba(8,4,20,0.92)';
      ctx.fillRect(x, base - bh, bw, bh);
      // Lit windows.
      var cols = Math.max(1, Math.floor(bw / 12));
      var rows = Math.max(1, Math.floor(bh / 16));
      for (var c = 0; c < cols; c++) {
        for (var rr = 0; rr < rows; rr++) {
          if (rnd() < 0.42) {
            ctx.fillStyle = rnd() < 0.75 ? 'rgba(255,214,120,0.95)' : 'rgba(150,220,255,0.9)';
            ctx.fillRect(x + 3 + c * 12, base - bh + 5 + rr * 16, 5, 7);
          }
        }
      }
      // Antenna on the taller blocks.
      if (bh > r.h * 0.4 && rnd() < 0.6) {
        ctx.strokeStyle = 'rgba(8,4,20,0.92)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + bw / 2, base - bh);
        ctx.lineTo(x + bw / 2, base - bh - 12);
        ctx.stroke();
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath(); ctx.arc(x + bw / 2, base - bh - 14, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      x += bw + 2 + rnd() * 6;
    }
  }

  function drawPalm(ctx, x, y, scale, lean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(6,3,16,0.95)';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -34, 14, -58); ctx.stroke();
    ctx.lineWidth = 4;
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI * 0.15 - i * 0.42;
      ctx.beginPath();
      ctx.moveTo(14, -58);
      ctx.quadraticCurveTo(14 + Math.cos(a) * 26, -58 + Math.sin(a) * 22 - 8, 14 + Math.cos(a) * 44, -58 + Math.sin(a) * 30 + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackdrop(ctx, r, grade, seed) {
    var g = GRADES[grade] || GRADES.viceSunset;
    var rnd = mulberry32(seed);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    drawSky(ctx, r, g, rnd);
    drawSkyline(ctx, r, rnd);
    drawPalm(ctx, r.x + r.w * 0.06, r.y + r.h * 0.98, Math.min(r.w, r.h) / 320, -0.12);
    drawPalm(ctx, r.x + r.w * 0.94, r.y + r.h * 0.98, Math.min(r.w, r.h) / 380, 0.14);
    ctx.restore();
  }

  function drawPhoto(ctx, img, r, zoom, panX, panY) {
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    var z = Math.max(0.4, zoom || 1);
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var scale = Math.max(r.w / iw, r.h / ih) * z;
    var dw = iw * scale, dh = ih * scale;
    var dx = r.x + (r.w - dw) / 2 + (panX || 0);
    var dy = r.y + (r.h - dh) / 2 + (panY || 0);
    ctx.drawImage(img, dx, dy, dw, dh);
    // A gentle dark foot so the title band reads over any photo.
    var shade = ctx.createLinearGradient(0, r.y + r.h * 0.55, 0, r.y + r.h);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = shade;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  function fitFont(ctx, text, fontFamily, maxWidth, startPx) {
    var px = startPx;
    ctx.font = px + 'px ' + fontFamily;
    while (px > 12 && ctx.measureText(text).width > maxWidth) {
      px -= 2;
      ctx.font = px + 'px ' + fontFamily;
    }
    return px;
  }

  function renderCover(canvas, state) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var g = GRADES[state.grade] || GRADES.viceSunset;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0618';
    ctx.fillRect(0, 0, w, h);
    var panels = layoutPanels(state.layout, w, h);
    var photos = state.photos || [];
    for (var i = 0; i < panels.length; i++) {
      var r = panels[i];
      var img = photos[i] || null;
      if (img && img.complete && (img.naturalWidth || img.width)) {
        drawPhoto(ctx, img, r, (state.zooms || [])[i] || 1, (state.pans || [])[i * 2] || 0, (state.pans || [])[i * 2 + 1] || 0);
      } else {
        drawBackdrop(ctx, r, state.grade, 1234 + i * 777);
      }
    }
    // Grade wash + vignette over the whole cover.
    ctx.fillStyle = g.wash;
    ctx.fillRect(0, 0, w, h);
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    // Title band.
    var bandH = Math.round(h * 0.17);
    ctx.fillStyle = g.band;
    ctx.fillRect(0, h - bandH, w, bandH);
    ctx.fillStyle = g.accent;
    ctx.fillRect(0, h - bandH, w, Math.max(3, Math.round(h * 0.006)));
    var pad = Math.round(w * 0.03);
    var caption = (state.caption || '').toUpperCase();
    var capPx = fitFont(ctx, caption, '"Anton", sans-serif', w - pad * 2, Math.round(bandH * 0.52));
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = capPx + 'px "Anton", sans-serif';
    ctx.fillText(caption, pad, h - bandH + bandH * 0.36);
    var sub = state.subtitle || '';
    if (sub) {
      var subPx = fitFont(ctx, sub, '"Archivo Black", sans-serif', w - pad * 2, Math.round(bandH * 0.2));
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = subPx + 'px "Archivo Black", sans-serif';
      ctx.fillText(sub, pad, h - bandH + bandH * 0.76);
    }
    return canvas;
  }

  window.ViceCover = {
    GRADES: GRADES,
    layoutPanels: layoutPanels,
    renderCover: renderCover,
    drawBackdrop: drawBackdrop
  };
})();
