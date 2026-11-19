// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover hides the controls and shows the cover alone.
// `photo` picks the sample (samples/<photo>.jpg), `caption` and `subtitle`
// the words, `layout` and `grade` the look, `panels=all` fills every panel
// with the same photo. window.__shotReady is set once painted.
const LAYOUTS = ['hero', 'triptych', 'corners'];
const GRADES = ['sunset', 'neon', 'ocean', 'noir'];

/**
 * Configure the editor from the URL query and paint it.
 * ctx: { state, fitPanels, loadSample, redraw } from main.js.
 */
export async function runShot(query, ctx) {
  const { state, fitPanels, loadSample, redraw } = ctx;
  const layout = query.get('layout');
  if (layout && LAYOUTS.includes(layout)) state.layout = layout;
  const grade = query.get('grade');
  if (grade && GRADES.includes(grade)) state.grade = grade;
  const caption = query.get('caption');
  if (caption !== null) {
    state.caption = caption;
    const el = document.getElementById('caption');
    if (el) el.value = caption;
  }
  const subtitle = query.get('subtitle');
  if (subtitle !== null) {
    state.subtitle = subtitle;
    const el = document.getElementById('subtitle');
    if (el) el.value = subtitle;
  }
  fitPanels();
  const photo = query.get('photo') ?? 'pier';
  await loadSample(photo, 0);
  if (query.get('panels') === 'all') {
    for (let i = 1; i < state.panels.length; i++) {
      state.panels[i].img = state.panels[0].img;
    }
  }
  if (query.get('shot') === 'cover') {
    state.hideSelection = true;
    document.body.classList.add('shot-cover');
  }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
