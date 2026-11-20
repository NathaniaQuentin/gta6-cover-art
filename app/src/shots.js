'use strict';
/* Vice Cover Studio — screenshot staging.
   Sets the editor up for each of the four screenshots: the cover, the
   editor itself, and the portrait and square covers. Scenes are chosen
   by name, or spelled out in the page's query string, e.g.
   ?shot=cover&photo=pier&caption=Neon%20Heat
   Depends on main.js (window.__vc) and cover.js (LAYOUTS). */

const SCENES = {
  cover: {
    layout: 'hero', grade: 'sunset', photo: 'pier',
    caption: 'NEON HEAT', subtitle: 'Vice City Nights', size: '1920x1080',
  },
  editor: {
    layout: 'hero', grade: 'sunset', photo: 'pier',
    caption: 'NEON HEAT', subtitle: 'Vice City Nights', size: '1920x1080',
  },
  portrait: {
    layout: 'triptych', grade: 'neon', photo: 'boulevard',
    caption: 'PALM SHADOWS', subtitle: 'Midnight Drive', size: '1080x1350',
  },
  square: {
    layout: 'four', grade: 'ocean', photo: 'pier',
    caption: 'GOLDEN HOUR', subtitle: 'Ocean Drive', size: '1080x1080',
  },
};

/* Put the editor into one scene and render it, waiting for the fonts
   and the photo so the canvas is final before a screenshot is taken. */
async function stageScene(name) {
  const scene = SCENES[name];
  if (!scene) return false;
  const vc = window.__vc;
  await vc.ready;
  const state = vc.state;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  state.size = scene.size;
  state.samePhoto = true;
  state.selected = 0;
  state.showSelection = false;
  const count = LAYOUTS[scene.layout].panels;
  state.panels = [];
  for (let i = 0; i < count; i++) {
    state.panels.push({ photo: scene.photo, zoom: 1, ox: 0, oy: 0 });
  }
  await vc.loadPhoto(scene.photo);
  vc.render();
  await document.fonts.ready;
  vc.render();
  return true;
}

/* Apply a query string over the current state, e.g. the shots.json
   entries: ?shot=cover&photo=pier&caption=Neon%20Heat */
async function applyQuery(search) {
  const q = new URLSearchParams(search);
  if (q.get('shot') && SCENES[q.get('shot')]) {
    await stageScene(q.get('shot'));
    return;
  }
  const vc = window.__vc;
  await vc.ready;
  const state = vc.state;
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade')) state.grade = q.get('grade');
  if (q.get('caption')) state.caption = q.get('caption');
  if (q.get('subtitle')) state.subtitle = q.get('subtitle');
  if (q.get('size')) state.size = q.get('size');
  if (q.get('photo')) {
    const count = LAYOUTS[state.layout].panels;
    state.panels = [];
    for (let i = 0; i < count; i++) {
      state.panels.push({ photo: q.get('photo'), zoom: 1, ox: 0, oy: 0 });
    }
    await vc.loadPhoto(q.get('photo'));
  }
  state.selected = 0;
  vc.render();
  await document.fonts.ready;
  vc.render();
}

window.__vc.stage = stageScene;
window.__vc.staged = applyQuery(window.location.search);
