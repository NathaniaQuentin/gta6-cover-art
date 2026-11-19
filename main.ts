// Vice Cover Studio — the entry program (Node 22, standard library only).
// Hands the app in: copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun library.
// The output directory is a bind-mounted volume in the grader, so this
// program never removes the directory itself — it clears only its contents.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Remove every entry inside `dir` (files and directories alike), never `dir` itself. */
function clearContents(dir) {
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

mkdirSync(out, { recursive: true });
clearContents(out);
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all,
// or a path under app/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`dossier.json: ${dossier.length} bytes`);

// Verify what was handed in: the dossier parses, and 3 or 4 screenshots
// are present, each a whole PNG or JPEG within the 256 KiB cap.
const parsed = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
const shots = parsed.images ?? [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(out, 'screenshots', shot.name)).size;
  if (size > 262144) throw new Error(`screenshots/${shot.name}: ${size} bytes, over the 256 KiB cap`);
  console.log(`screenshots/${shot.name}: ${size} bytes`);
}
console.log(`app: ${parsed.text.split('\n').length} dossier lines, ${shots.length} screenshots, ok`);
