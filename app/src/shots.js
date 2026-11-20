// Vice Cover Studio — screenshot staging for the entry's screenshots.
// `?shot=cover|editor|portrait|square` picks a scene on load; the
// `window.__vc.stage(name)` hook lets a screenshot script stage a scene and
// wait for the fonts and the photo before capturing.

(function () {
  const SCENES = {
    cover: {
      layout: 'hero', grade: 'sunset',
      caption: 'VICE HEAT', subtitle: 'Leonida Nights',
      sample: 'pier',
    },
    editor: {
      layout: 'hero', grade: 'sunset',
      caption: 'VICE HEAT', subtitle: 'Leonida Nights',
      sample: 'boulevard',
    },
    portrait: {
      layout: 'triptych', grade: 'neon',
      caption: 'NEON TIDE', subtitle: 'Vice City',
      sample: 'pier',
    },
    square: {
      layout: 'corners', grade: 'ocean',
      caption: 'SALT AIR', subtitle: 'Ocean Drive',
      sample: 'boulevard',
    },
  };

  function stage(name) {
    const vc = window.__vc;
    if (!vc || !SCENES[name]) return Promise.resolve(false);
    const scene = SCENES[name];
    vc.setScene(scene);
    // Wait for the caption fonts and the sample photo before signalling ready.
    return Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((resolve) => vc.loadSample(scene.sample, () => resolve(true))),
    ]).then(() => {
      vc.draw();
      window.__vc.ready = true;
      return true;
    });
  }

  window.__vc.stage = stage;

  // Auto-stage from the query string so a plain page load can be captured.
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && SCENES[shot]) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => stage(shot));
    } else {
      stage(shot);
    }
  }
})();
