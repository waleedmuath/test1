// Render stills at given times:  node tools/stills.mjs <outDir> t1 t2 ...  [--sheet name.jpg]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, openPage, ROOT } from './harness.mjs';

const args = process.argv.slice(2);
const sheetIdx = args.indexOf('--sheet');
const sheet = sheetIdx >= 0 ? args.splice(sheetIdx, 2)[1] : null;
const out = path.resolve(ROOT, args.shift() || 'out/stills');
const times = args.map(Number);
fs.mkdirSync(out, { recursive: true });
const { server, port } = await serve();
const { browser, page } = await openPage(port);
const files = [];
for (const t of times) {
  const t0 = Date.now();
  const url = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.92); }, t);
  const f = path.join(out, `t${t.toFixed(2).padStart(5, '0')}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  files.push(f);
  console.log(f, `${Date.now() - t0}ms`);
}
await browser.close();
server.close();
if (sheet && files.length) {
  const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap(f => ['-i', f]);
  const fc = files.map((_, i) => `[${i}:v]scale=480:270,drawtext=text='${path.basename(files[i], '.jpg').slice(1)}':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5[v${i}]`).join(';')
    + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|')}:fill=black[o]`;
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', '-q:v', '3', path.join(out, sheet)]);
  } catch {
    const fc2 = fc.replace(/,drawtext=[^\[]*?(?=\[v)/g, '');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc2, '-map', '[o]', '-frames:v', '1', '-q:v', '3', path.join(out, sheet)]);
  }
  console.log(path.join(out, sheet), `${cols}×${rows}`);
}
