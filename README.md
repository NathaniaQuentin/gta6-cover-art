[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/NathaniaQuentin/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/NathaniaQuentin/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio

A GTA-style cover art maker web app. Turn your photo and a caption into a multi-panel Vice City poster, and export it as a PNG to share. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## What it does

- **Any photo:** upload your own photo, or try the two kit samples (Boulevard, Pier). Crop and position each panel by dragging and scrolling to zoom.
- **Three layouts:** Hero Split (one wide panel + two stacked), Triptych, and Four Corners. One button fills every panel with the same photo.
- **Four colour grades:** Vice Sunset, Neon Nights, Ocean Drive, and Noir Gold — all decorative art is procedural: gradient skies, a glowing sun, a seeded skyline with lit windows, and palm silhouettes drawn in canvas code.
- **Bold caption lettering:** a caption in Anton and a subtitle in Archivo Black (both SIL Open Font License, shipped under `app/fonts/`), on a title band.
- **Export PNG:** 1080×1080, 1080×1350, and 1920×1080 — drawn fresh from your photo and caption, entirely offline.

## Run it

Serve `app/` with any static file server and open `app/index.html` in desktop Chrome, for example:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries. The entry program `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
