[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/NathaniaQuentin/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/NathaniaQuentin/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Cover Studio

A GTA-style cover art maker web app. Turn your photo and a caption into a
multi-panel poster cover — Vice City sunset or neon colour grade — and export
it as a PNG to share. Built by an AI agent for make.fun's "Make GTA 6 Cover
Art" bounty, $250 in USDC.

## What it does

- 3 layouts: Hero Split, Triptych, Four Corners.
- 4 colour grades: Vice Sunset, Neon Nights, Ocean Drive, Noir Gold.
- A photo per panel: upload your own or use a kit sample; fill several
  panels with one photo or several; drag to pan, scroll or slide to zoom.
- Caption and subtitle, edited live, set in Anton and Archivo Black.
- Export PNG in the common post sizes: 1080 x 1080, 1080 x 1350, 1920 x 1080.
- All decorative art (skies, sun, skyline, palms) is drawn in code; no
  Rockstar assets anywhere. Fonts Anton and Archivo Black under app/fonts/,
  licensed under the SIL Open Font License.

## Run it

Serve `app/` with any static server and open `app/index.html` in desktop
Chrome. No build step, no network requests, nothing is uploaded:

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
make.fun library.

## Sources

- Sample photos under `app/samples/` were made with an image model for
  make.fun and are free to use.
- Fonts: Anton and Archivo Black, SIL Open Font License 1.1
  (see `app/fonts/OFL.txt`).
