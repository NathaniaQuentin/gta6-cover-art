// Vice Cover Studio — screenshot staging for the entry's screenshots.
// `?shot=cover|editor|portrait|square` picks a scene on load; the
// `window.__vc.stage(name)` hook lets a screenshot script stage a scene and
// wait for the fonts and the photo before capturing.

(function () {
  'use strict';

  var SCENES = {
    cover: { layout: 'hero', grade: 'viceSunset', caption: 'MIDNIGHT HEAT', subtitle: 'Leonida Nights' },
    editor: { layout: 'hero', grade: 'viceSunset', caption: 'MIDNIGHT HEAT', subtitle: 'Leonida Nights' },
    portrait: { layout: 'triptych', grade: 'neonNights', caption: 'PALM DUSK', subtitle: 'Midnight Drive' },
    square: { layout: 'four', grade: 'oceanDrive', caption: 'NEON TIDE', subtitle: 'Vice City' }
  };

  function currentScene() {
    var m = /[?&]shot=([a-z]+)/.exec(window.location.search || '');
    return (m && SCENES[m[1]]) ? m[1] : 'cover';
  }

  function stage(name, done) {
    var scene = SCENES[name] || SCENES.cover;
    var studio = window.ViceStudio;
    if (!studio) { if (done) done(); return; }
    studio.state.layout = scene.layout;
    studio.state.grade = scene.grade;
    studio.state.caption = scene.caption;
    studio.state.subtitle = scene.subtitle;
    studio.state.samePhoto = true;
    var img = new Image();
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      studio.render();
      if (done) done();
    }
    img.onload = function () {
      studio.state.photos[0] = img;
      for (var i = 1; i < 4; i++) studio.state.photos[i] = img;
      finish();
    };
    img.onerror = finish;
    img.src = 'samples/boulevard.jpg';
    // If the fonts are still loading, wait for them so the caption lettering
    // is the real Anton / Archivo Black in the capture.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { studio.render(); });
    }
    setTimeout(finish, 2500);
  }

  window.__vc = {
    stage: stage,
    scene: currentScene,
    scenes: Object.keys(SCENES)
  };

  document.addEventListener('DOMContentLoaded', function () {
    stage(currentScene());
  });
})();
