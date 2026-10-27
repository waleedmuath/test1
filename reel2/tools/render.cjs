'use strict';
// Offline renderer: score → loudness-normalised AAC, frames → H.264 segments in parallel, then one MP4.
//   node tools/render.cjs --lang en|ar [--samples 3] [--workers 2] [--from 0 --to 1800] [--out out/name.mp4]
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { open, ROOT } = require('./browser.cjs');

const FPS = 60, DUR = 30, TOTAL = FPS * DUR;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'en') === 'ar' ? 'ar' : 'en';
const SAMPLES = +arg('samples', 2);
const WORKERS = +arg('workers', 4);
const FROM = +arg('from', 0), TO = +arg('to', TOTAL);
const OUT = path.resolve(ROOT, arg('out', `out/jofunction-reel2-${LANG}.mp4`));
const WORK = path.join(ROOT, 'out', `.work-${LANG}`);
fs.mkdirSync(WORK, { recursive: true });

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const fmt = s => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}s`;

async function audio() {
  const { browser, page } = await open('index.html', `capture&lang=${LANG}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const b64 = await page.evaluate(() => window.captureAudio());
  await browser.close();
  const raw = path.join(WORK, 'score.wav');
  fs.writeFileSync(raw, Buffer.from(b64, 'base64'));
  // two-pass EBU R128 to -14 LUFS / -1 dBTP
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1:LRA=11:print_format=json', '-f', 'null', '-']).stderr.toString();
  let m = null;
  try { m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1)); } catch (e) { /* fall back to one pass */ }
  const ln = m ? `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true` : 'loudnorm=I=-14:TP=-1:LRA=11';
  const wav = path.join(WORK, 'score-norm.wav');
  sh('ffmpeg', ['-y', '-hide_banner', '-i', raw, '-af', `${ln},aresample=48000`, '-c:a', 'pcm_s24le', wav]);
  console.log('audio', m ? `in ${m.input_i} LUFS / ${m.input_tp} dBTP → -14 LUFS` : '(single pass)');
  return wav;
}

async function worker(k, a, b, t0) {
  const seg = path.join(WORK, `seg-${String(k).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
    '-tune', 'film', '-x264-params', 'keyint=60:min-keyint=60:scenecut=0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  const { browser, page } = await open('index.html', `capture&lang=${LANG}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  for (let i = a; i < b; i++) {
    const url = await page.evaluate(([n, s]) => window.frameData(n, s), [i, SAMPLES]);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (k === 0 && (i - a) % 30 === 0) {
      const p = (i - a + 1) / (b - a), el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r[${LANG}] ${(p * 100).toFixed(1)}%  ${fmt(el)} elapsed, ~${fmt(el / p - el)} left   `);
    }
  }
  ff.stdin.end();
  await browser.close();
  await done;
  return seg;
}

(async () => {
  const t0 = Date.now();
  const wav = await audio();
  // a GOP-aligned split so the segments concatenate without re-encoding
  const n = TO - FROM, per = Math.ceil(n / WORKERS / 60) * 60, jobs = [];
  for (let k = 0, a = FROM; a < TO; k++, a += per) jobs.push(worker(k, a, Math.min(TO, a + per), t0));
  const segs = await Promise.all(jobs);
  process.stdout.write('\n');
  const list = path.join(WORK, 'segments.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const ss = FROM / FPS, dur = n / FPS;
  sh('ffmpeg', ['-y', '-hide_banner', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(ss), '-t', String(dur), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart',
    '-metadata', `title=JoFunction — Motion Reel (${LANG.toUpperCase()})`, '-shortest', OUT]);
  console.log(`${path.relative(ROOT, OUT)}  ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB  in ${fmt((Date.now() - t0) / 1000)}`);
})().catch(e => { console.error(e); process.exit(1); });
