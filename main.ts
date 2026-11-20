import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const repoRoot = new URL('.', import.meta.url).pathname;

// The grader bind-mounts the output directory, so never delete the
// directory itself: create it, then clear only its contents.
mkdirSync(outputDir, { recursive: true });
for (const name of readdirSync(outputDir)) {
  rmSync(join(outputDir, name), { recursive: true, force: true });
}

cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

// Verify what was just written: the dossier must parse back, name its
// schema, and the screenshots on disk must be 3 or 4 files, each within
// the 256 KiB cap. Fail loudly instead of handing in a bad output.
const parsed = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (parsed.schema !== 'makefun/dossier/v1') {
  throw new Error(`vice-cover-studio: dossier schema is ${parsed.schema}, expected makefun/dossier/v1`);
}
if (!existsSync(join(outputDir, 'app', 'index.html'))) {
  throw new Error('vice-cover-studio: app/index.html missing from the output');
}
const shots = readdirSync(join(outputDir, 'screenshots')).sort();
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`vice-cover-studio: ${shots.length} screenshots, expected 3 or 4`);
}
const shotLines = shots.map((name) => {
  const bytes = statSync(join(outputDir, 'screenshots', name)).size;
  if (bytes > 262144) throw new Error(`vice-cover-studio: ${name} is ${bytes} bytes, over the 256 KiB cap`);
  return `  ${name} (${bytes} bytes)`;
});
console.log(`vice-cover-studio: wrote ${dossierPath} (${dossier.length} bytes)`);
console.log('screenshots:');
for (const line of shotLines) console.log(line);
