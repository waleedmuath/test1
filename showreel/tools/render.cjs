'use strict';
// Renders the reel to MP4: offline-renders the score, then streams every frame
// (motion-blurred, 4 sub-frames @ 180° shutter) from N parallel pages into
// ffmpeg segments, concatenates them and muxes the audio.
//
//   node tools/render.cjs [--lang ar|en] [--audio-only] [--workers 4] [--samples 4] [--out out/jofunction-motion-reel.mp4]
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { openReel, ROOT } = require('./browser.cjs');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const AUDIO_ONLY = args.includes('--audio-only');
const WORKERS = +opt('--workers', 4);
const SAMPLES = +opt('--samples', 4);
const LANG = String(opt('--lang', 'ar')).toLowerCase();
if (!['ar', 'en'].includes(LANG)) { console.error('--lang must be ar or en'); process.exit(1); }
const QUERY = `capture=1&lang=${LANG}`;
const OUT = path.resolve(ROOT, opt('--out', LANG === 'en' ? 'out/jofunction-motion-reel-en.mp4' : 'out/jofunction-motion-reel.mp4'));
const WORK = path.resolve(ROOT, opt('--work', `out/.work-${LANG}`));
const FPS = 60, DUR = 30, FRAMES = FPS * DUR;

function ffmpeg(argv, stdin = false) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: [stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code)))));
  return { p, done };
}

async function renderAudio(page) {
  const b64 = await page.evaluate(() => window.captureAudio());
  const raw = path.join(WORK, 'score_raw.wav');
  fs.writeFileSync(raw, Buffer.from(b64, 'base64'));
  // two-pass linear loudness normalisation to streaming level (-14 LUFS, -1 dBTP)
  const wav = path.join(WORK, 'score.wav');
  const LN = 'loudnorm=I=-14:TP=-1.0:LRA=20';
  const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf('{'), pass1.stderr.lastIndexOf('}') + 1));
  // deterministic: static gain to -14 LUFS, then a transparent true-peak ceiling at -1 dBFS
  const af = `volume=${(-14 - Number(m.input_i)).toFixed(2)}dB,alimiter=limit=0.891:attack=2:release=60:level=false`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-af', af, '-ar', '48000', wav]);
  console.log(`  score: ${m.input_i} LUFS → -14 LUFS (true peak in ${m.input_tp} dBTP)`);
  return wav;
}

async function renderSegment(k, from, to) {
  const { browser, page } = await openReel({ query: QUERY });
  const seg = path.join(WORK, `seg_${k}.mp4`);
  const ff = ffmpeg([
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation',
    '-g', '120', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    seg
  ], true);
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const url = await page.evaluate(({ i, s }) => window.frameDataURL(i, s), { i, s: SAMPLES });
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.p.stdin.write(buf)) await new Promise(r => ff.p.stdin.once('drain', r));
    if ((i - from) % 60 === 0) process.stdout.write(`  worker ${k}: frame ${i}/${to - 1} (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
  }
  ff.p.stdin.end();
  await ff.done;
  await browser.close();
  return seg;
}

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const { browser, page } = await openReel({ query: QUERY });
  console.log(`Rendering score… (${LANG})`);
  const wav = await renderAudio(page);
  await browser.close();
  if (AUDIO_ONLY) { console.log(wav); return; }

  console.log(`Rendering ${FRAMES} frames with ${WORKERS} workers, ${SAMPLES} motion-blur samples…`);
  const per = Math.ceil(FRAMES / WORKERS);
  const segs = await Promise.all(Array.from({ length: WORKERS }, (_, k) => renderSegment(k, k * per, Math.min(FRAMES, (k + 1) * per))));
  const list = path.join(WORK, 'segments.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n') + '\n');
  console.log('Muxing…');
  const mux = ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', OUT]);
  await mux.done;
  console.log(OUT);
})().catch(e => { console.error(e); process.exit(1); });
