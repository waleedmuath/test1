'use strict';
// Stills at given seconds (full resolution), or a labelled contact sheet with --sheet.
//   node tools/stills.cjs <dir> <seconds…> [--lang en] [--samples 4] [--sheet file.jpg]
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { launch } = require('./browser.cjs');

const [, , ...argv] = process.argv;
const take = (name, dflt) => { const i = argv.indexOf(name); if (i < 0) return dflt; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const LANG = take('--lang', 'ar'), SAMPLES = Number(take('--samples', 1)), SHEET = take('--sheet', null);
const [dir, ...secs] = argv;

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const { pages: [page], close } = await launch(LANG, 1);
  const files = [];
  for (const t of secs.map(Number)) {
    const url = await page.evaluate(([t, s]) => { window.renderAt(t, s); return document.getElementById('reel').toDataURL('image/png'); }, [t, SAMPLES]);
    const file = path.join(dir, `${LANG}-${t.toFixed(2)}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    files.push(file);
  }
  await close();
  if (!SHEET) { console.log(files.join('\n')); return; }
  const cols = Math.min(6, files.length), rows = Math.ceil(files.length / cols);
  const cells = files.map((_, i) => `[${i}:v]scale=270:480,drawtext=text='${secs[i]}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[c${i}]`);
  const layout = files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|');
  const graph = `${cells.join(';')};${files.map((_, i) => `[c${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...files.flatMap(f => ['-i', f]), '-filter_complex', graph, '-frames:v', '1', '-q:v', '3', SHEET]);
  console.log(SHEET, `(${cols}×${rows})`);
})().catch(err => { console.error(err); process.exitCode = 1; });
