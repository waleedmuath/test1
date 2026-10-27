'use strict';
// Full-resolution stills at given seconds, plus an optional contact sheet.
//   node tools/stills.cjs <outDir> <t1> <t2> … [--lang en] [--samples 4] [--sheet sheet.jpg] [--cols 6]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openReel } = require('./browser.cjs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const LANG = opt('--lang', 'ar'), SAMPLES = +opt('--samples', 1), SHEET = opt('--sheet', null), COLS = +opt('--cols', 6);
const [outDir, ...times] = args;
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await openReel({ query: `capture=1&lang=${LANG}` });
  const files = [];
  for (const t of times.map(Number)) {
    const url = await page.evaluate(({ t, s }) => { window.renderAt(t, s); return document.getElementById('c').toDataURL('image/png'); }, { t, s: SAMPLES });
    const f = path.join(outDir, `${LANG}-${t.toFixed(2).padStart(5, '0')}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    files.push(f);
  }
  await browser.close();
  if (SHEET) {
    const rows = Math.ceil(files.length / COLS);
    const inputs = files.flatMap(f => ['-i', f]);
    const scale = files.map((_, i) => `[${i}:v]scale=270:480,drawtext=text='${times[i]}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';');
    const pad = [];
    for (let i = files.length; i < rows * COLS; i++) pad.push(`color=c=black:s=270x480:d=1[v${i}]`);
    const all = Array.from({ length: rows * COLS }, (_, i) => `[v${i}]`).join('');
    const layout = Array.from({ length: rows * COLS }, (_, i) => `${(i % COLS) * 270}_${Math.floor(i / COLS) * 480}`).join('|');
    const fc = [scale, ...pad, `${all}xstack=inputs=${rows * COLS}:layout=${layout}`].join(';');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-frames:v', '1', '-q:v', '3', SHEET]);
    console.log(SHEET);
  } else console.log(files.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
