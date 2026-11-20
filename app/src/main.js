// Vice Cover Studio — editor wiring: photos, layout, grade, caption, export.
// Plain classic scripts, no libraries. Photos are read on the user's own
// machine (FileReader) or loaded from the kit's sample files under app/;
// nothing is ever uploaded anywhere.

(function () {
  'use strict';

  var PREVIEW_W = 960, PREVIEW_H = 600;

  var state = {
    layout: 'hero',
    grade: 'viceSunset',
    caption: 'MIDNIGHT HEAT',
    subtitle: 'Leonida Nights',
    photos: [null, null, null, null],
    zooms: [1, 1, 1, 1],
    pans: [0, 0, 0, 0, 0, 0, 0, 0],
    samePhoto: false,
    selected: 0
  };

  var preview, ctx;
  var dragging = null;

  function $(id) { return document.getElementById(id); }

  function panelCount() {
    return state.layout === 'hero' ? 3 : state.layout === 'triptych' ? 3 : 4;
  }

  function render() {
    if (!preview) return;
    preview.width = PREVIEW_W;
    preview.height = PREVIEW_H;
    window.ViceCover.renderCover(preview, state);
    var n = panelCount();
    for (var i = 0; i < 4; i++) {
      var chip = $('panel-' + i);
      if (chip) chip.style.display = i < n ? '' : 'none';
    }
    var zoom = $('zoom');
    if (zoom) zoom.value = state.zooms[state.selected];
    var cap = $('caption');
    if (cap && document.activeElement !== cap) cap.value = state.caption;
    var sub = $('subtitle');
    if (sub && document.activeElement !== sub) sub.value = state.subtitle;
  }

  function loadImageFile(file, slot) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        placePhoto(img, slot);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function loadSample(url, slot) {
    var img = new Image();
    img.onload = function () { placePhoto(img, slot); };
    img.onerror = function () { setStatus('Sample photo failed to load: ' + url); };
    img.src = url;
  }

  function placePhoto(img, slot) {
    if (state.samePhoto) {
      for (var i = 0; i < panelCount(); i++) {
        state.photos[i] = img;
        state.zooms[i] = 1;
        state.pans[i * 2] = 0;
        state.pans[i * 2 + 1] = 0;
      }
    } else {
      state.photos[slot] = img;
      state.zooms[slot] = 1;
      state.pans[slot * 2] = 0;
      state.pans[slot * 2 + 1] = 0;
    }
    setStatus('Photo loaded into panel ' + (slot + 1) + (state.samePhoto ? ' (all panels)' : '') + '.');
    render();
  }

  function setStatus(msg) {
    var el = $('status');
    if (el) el.textContent = msg;
  }

  function exportPNG(w, h, label) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    window.ViceCover.renderCover(off, state);
    off.toBlob(function (blob) {
      if (!blob) { setStatus('Export failed.'); return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vice-cover-' + w + 'x' + h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      setStatus('Exported ' + label + ' (' + w + ' x ' + h + ' PNG).');
    }, 'image/png');
  }

  function bind() {
    preview = $('preview');
    // Layout buttons.
    var layouts = document.querySelectorAll('[data-layout]');
    layouts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.layout = btn.getAttribute('data-layout');
        state.selected = 0;
        layouts.forEach(function (b) { b.classList.toggle('active', b === btn); });
        setStatus('Layout: ' + btn.textContent.trim() + '.');
        render();
      });
    });
    // Grade buttons.
    var grades = document.querySelectorAll('[data-grade]');
    grades.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.grade = btn.getAttribute('data-grade');
        grades.forEach(function (b) { b.classList.toggle('active', b === btn); });
        setStatus('Grade: ' + btn.textContent.trim() + '.');
        render();
      });
    });
    // Panel chips.
    for (var i = 0; i < 4; i++) {
      (function (slot) {
        var chip = $('panel-' + slot);
        if (!chip) return;
        chip.addEventListener('click', function () {
          state.selected = slot;
          for (var j = 0; j < 4; j++) {
            var c = $('panel-' + j);
            if (c) c.classList.toggle('active', j === slot);
          }
          setStatus('Panel ' + (slot + 1) + ' selected — drag to move the photo, scroll to zoom.');
          render();
        });
      })(i);
    }
    // Upload + samples.
    var up = $('upload');
    if (up) {
      up.addEventListener('change', function () {
        if (up.files && up.files[0]) loadImageFile(up.files[0], state.selected);
        up.value = '';
      });
    }
    var s1 = $('sample-boulevard');
    if (s1) s1.addEventListener('click', function () { loadSample('samples/boulevard.jpg', state.selected); });
    var s2 = $('sample-pier');
    if (s2) s2.addEventListener('click', function () { loadSample('samples/pier.jpg', state.selected); });
    var same = $('same-photo');
    if (same) {
      same.addEventListener('change', function () {
        state.samePhoto = same.checked;
        if (state.samePhoto && state.photos[state.selected]) {
          placePhoto(state.photos[state.selected], state.selected);
        }
        setStatus(state.samePhoto ? 'Same photo in all panels.' : 'Each panel has its own photo.');
        render();
      });
    }
    // Caption inputs.
    var cap = $('caption');
    if (cap) cap.addEventListener('input', function () { state.caption = cap.value; render(); });
    var sub = $('subtitle');
    if (sub) sub.addEventListener('input', function () { state.subtitle = sub.value; render(); });
    // Zoom slider.
    var zoom = $('zoom');
    if (zoom) {
      zoom.addEventListener('input', function () {
        state.zooms[state.selected] = parseFloat(zoom.value);
        render();
      });
    }
    var centre = $('centre');
    if (centre) {
      centre.addEventListener('click', function () {
        state.zooms[state.selected] = 1;
        state.pans[state.selected * 2] = 0;
        state.pans[state.selected * 2 + 1] = 0;
        render();
      });
    }
    // Drag to pan, wheel to zoom on the preview.
    preview.addEventListener('pointerdown', function (e) {
      dragging = { x: e.clientX, y: e.clientY };
      preview.setPointerCapture(e.pointerId);
    });
    preview.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = preview.getBoundingClientRect();
      var sx = preview.width / rect.width, sy = preview.height / rect.height;
      state.pans[state.selected * 2] += (e.clientX - dragging.x) * sx;
      state.pans[state.selected * 2 + 1] += (e.clientY - dragging.y) * sy;
      dragging = { x: e.clientX, y: e.clientY };
      render();
    });
    preview.addEventListener('pointerup', function () { dragging = null; });
    preview.addEventListener('wheel', function (e) {
      e.preventDefault();
      var z = state.zooms[state.selected] * (e.deltaY < 0 ? 1.08 : 0.93);
      state.zooms[state.selected] = Math.min(3, Math.max(0.4, z));
      render();
    }, { passive: false });
    // Export buttons.
    document.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-export').split('x');
        exportPNG(parseInt(parts[0], 10), parseInt(parts[1], 10), btn.textContent.trim());
      });
    });
  }

  // Stage a named scene for screenshots (called by shots.js).
  function stageScene(name) {
    if (name === 'portrait') {
      state.layout = 'triptych';
      state.grade = 'neonNights';
      state.caption = 'PALM DUSK';
      state.subtitle = 'Midnight Drive';
    } else if (name === 'square') {
      state.layout = 'four';
      state.grade = 'oceanDrive';
      state.caption = 'NEON TIDE';
      state.subtitle = 'Vice City';
    } else {
      state.layout = 'hero';
      state.grade = 'viceSunset';
      state.caption = 'MIDNIGHT HEAT';
      state.subtitle = 'Leonida Nights';
    }
    state.samePhoto = true;
    var img = new Image();
    img.onload = function () {
      placePhoto(img, 0);
      render();
    };
    img.src = 'samples/boulevard.jpg';
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { render(); });
    }
    render();
  });

  window.ViceStudio = {
    state: state,
    render: render,
    stageScene: stageScene,
    exportPNG: exportPNG
  };
})();
