// Vice Cover Studio — entry program (Node 22, standard library only).
// Copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory may be a bind-mounted volume in the grader, so this
// program never removes the directory itself: it creates it, then clears
// only the files and folders inside it.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function clearContents(dir: string): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

mkdirSync(out, { recursive: true });
clearContents(out);

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const parsed = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (typeof parsed !== 'object' || parsed === null || parsed.schema !== 'makefun/dossier/v1') {
  throw new Error('dossier.json did not parse back with the makefun/dossier/v1 schema');
}
if (!existsSync(join(out, 'app', 'index.html'))) {
  throw new Error('dossier check: app/index.html missing from the output');
}
const shotNames = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error('dossier check: expected 3-4 screenshots, found ' + shotNames.length);
}
for (const name of shotNames) {
  const bytes = statSync(join(out, 'screenshots', name)).size;
  if (bytes > 262144) throw new Error('dossier check: screenshot over 256 KiB: ' + name);
  console.log('  screenshot ' + name + ': ' + bytes + ' bytes');
}
console.log('Vice Cover Studio handed in: app/ + screenshots/ copied, dossier.json (' + dossier.length + ' bytes) written to ' + out);
