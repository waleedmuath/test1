# JoFunction — Motion Reel

A 30-second motion-design showreel for **JoFunction**, in English and Arabic. Every word, colour, typeface,
icon and the logo come from [jofunction.com](https://jofunction.com) and its Arabic edition. It shares no
code or assets with `../showreel`.

| | |
|---|---|
| `out/jofunction-reel2-en.mp4` | English · 1920×1080 · 60 fps · H.264 + AAC · −14 LUFS |
| `out/jofunction-reel2-ar.mp4` | Arabic (right-to-left layouts, Arabic type) · same spec |

## The cut — 96 BPM, 48 beats, 12 bars

| Time | Beats | Shot | What happens |
|---|---|---|---|
| 0.0 s | 0–3.5 | **Intro** | The site's own preloader: greetings in eight languages tick past on a filling rail, ending on the viewer's language, then collapse into a point of light |
| 2.2 s | 3.5–7.25 | **Hook** | *The future / doesn't build / itself.* lands one line per beat, each with a boom, shake and chromatic hit |
| 4.5 s | 7.25–13 | **Identity** | The hook bursts into ~26k GPU particles that re-form as *We do.*; its full stop flies to centre, becomes the orange tile, the mark draws itself with a spark and ignites in a shockwave; lockup with the tagline |
| 8.1 s | 13–17 | **Numbers** | A portal zoom through the mark onto orange: 12 services · 11 own products · 5 platforms roll in on odometers |
| 10.6 s | 17–29 | **Services** | A brand-shaped iris opens on all twelve services, one per beat, each with its own entry move and a drawn icon. Four worlds for the four groups: a perspective grid, a 3D neural net, light paper, a breach with hex rain. Ink, light-streak and glitch transitions between them |
| 18.1 s | 29–33 | **Products** | A whip pan into a 3D carousel of the eleven products, braking on JoFunction AI |
| 20.6 s | 33–37 | **Platforms** | Five platforms; their site icons draw on, joined by a single line |
| 23.1 s | 37–41 | **Process** | *Think. Design. Build. Launch. Keep alive.*, one word per hit, then the beat falls away to a heartbeat |
| 25.6 s | 41–43.5 | **Promise** | *We don't just build digital products. We keep them alive.* The ECG trace gathers into the mark's stroke |
| 27.2 s | 43.5–48 | **End card** | The largest hit of the reel and a lift into D major. Lockup, *Have something worth building? Let's build it.*, a cursor clicks **Start a project**, jofunction.com |

## How it is built

- **`src/engine.js`** resolves which shot (or which two, during a transition) is live at time *t* and renders it as a
  pure function of time. That makes every frame reproducible: the browser preview and the offline render are identical.
- **`src/gfx.js`** is a three.js/WebGL2 compositor. Each slot is a 2D canvas layer, a 3D stage, then another canvas layer.
  Two slots feed shader transitions (portal zoom, brand iris, fbm ink wipe, whip pan, light streak, glitch). After that
  come a bloom pyramid, a lens/grade pass (shake, zoom, radial chromatic aberration, light leaks, vignette, flash,
  highlight shoulder), sub-frame motion-blur accumulation, then grain and dither.
- **`src/particles.js`**: a text-to-text GPU particle morph and a depth-of-field dust/bokeh field.
- **`src/scenes.js`**: the ten shots, the timeline and the impact list (shake, aberration, punch-zoom and flash on the beat).
- **`src/draw.js`**: script-agnostic kinetic type (cached glyph sprites, so Arabic shaping is never broken
  by per-letter animation), draw-on line icons and the logo mark built from its SVG geometry.
- **`src/audio.js`**: the score, an original cinematic-hybrid cue in D minor synthesised with Web Audio in an
  `OfflineAudioContext`. It has braams, booms, risers, reverse cymbals, glass FM plucks, a formant choir,
  a sidechain-pumped groove, a ticking clock, odometer ticks, a carousel ratchet, a heartbeat on every ECG spike,
  and a UI click on the button. Every event is placed on the picture's beat grid.
- **`src/copy.js`**: all on-screen copy, verbatim from the English and Arabic site.

## Run it

```bash
npm install                                 # three.js (also vendored in vendor/)
npx serve .                                 # or any static server
# open http://localhost:3000/?lang=en  (or ?lang=ar) — press Play for picture + score, scrub with the slider
```

## Render it

Needs Node, Playwright's Chromium and ffmpeg. It runs headless with SwiftShader, so no GPU is required.

```bash
node tools/render.cjs --lang en            # → out/jofunction-reel2-en.mp4
node tools/render.cjs --lang ar            # → out/jofunction-reel2-ar.mp4
node tools/stills.cjs <dir> --lang ar --sheet 0 30 0.75 6   # contact sheet
node tools/stills.cjs <dir> 3.9 11.6       # full-resolution stills
```

The renderer captures the score, normalises it (two-pass EBU R128, −14 LUFS, −1 dBTP), renders frames in parallel
browser workers with 2× motion-blur sub-samples, pipes them into GOP-aligned x264 segments, then concatenates and muxes.

## Credits

Copy, palette, logo and icons © JoFunction. Fonts are from the site: Space Grotesk, IBM Plex Sans, IBM Plex Sans Arabic
and IBM Plex Mono, all under the SIL Open Font License. Design, animation, code and music by Claude.
