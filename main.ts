// Vice Cover Studio — entry program (Node 22, standard library only).
// Copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the vendored make.fun library. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory is a bind-mounted volume in the grader, so the
// program never deletes it: it creates it, then clears only its contents.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) {
  rmSync(join(out, name), { recursive: true, force: true });
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Pre-flight validation: the dossier must parse back with the makefun
// schema, the app entry point must exist, and the screenshots must be
// within the gate's limits, or the handover fails loudly here instead of
// silently in the grader.
const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') {
  throw new Error(`dossier schema mismatch: ${dossier.schema}`);
}
if (!existsSync(join(out, 'app', 'index.html'))) {
  throw new Error('app/index.html missing from the output');
}
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(out, 'screenshots', shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes, over 256 KiB`);
  console.log(`screenshot ${shot}: ${size} bytes`);
}

console.log(`Vice Cover Studio handed in: app/ + screenshots/ copied to ${out}, dossier.json written (${dossier.schema}).`);
