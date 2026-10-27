'use strict';
// Offline render: score → WAV, then frames from a pool of pages straight into one ffmpeg encode.
//   node tools/render.cjs [--lang ar|en] [--pages 4] [--samples 4] [--crf 16] [--audio-only]
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { launch, ROOT } = require('./browser.cjs');

const [, , ...argv] = process.argv;
const flag = (name, dflt) => { const i = argv.indexOf(name); return i < 0 ? dflt : argv[i + 1]; };
const LANG = flag('--lang', 'ar') === 'en' ? 'en' : 'ar';
const PAGES = Number(flag('--pages', 4)), SAMPLES = Number(flag('--samples', 4)), CRF = String(flag('--crf', 16));
const OUT = path.join(ROOT, 'out', `faz3at-e5tebar-reel-${LANG}.mp4`);
const WAV = path.join(ROOT, 'out', `.score-${LANG}.wav`);

(async () => {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const t0 = Date.now();
  const { pages, close } = await launch(LANG, PAGES);
  const { FPS, DUR } = await pages[0].evaluate(() => window.REEL);
  const total = Math.round(FPS * DUR);

  process.stdout.write(`[${LANG}] composing score… `);
  fs.writeFileSync(WAV, Buffer.from(await pages[0].evaluate(() => window.scoreWAV()), 'base64'));
  console.log('done');
  if (argv.includes('--audio-only')) { await close(); console.log(WAV); return; }

  // PNG frames on stdin + the score → H.264 High / BT.709 limited range + AAC, ready for Reels
  const opts = {
    input: ['-f', 'image2pipe', '-c:v', 'png', '-r', FPS, '-i', 'pipe:0', '-i', WAV],
    video: ['-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-profile:v', 'high', '-level:v', '4.2', '-g', FPS * 2,
      '-vf', 'scale=w=1080:h=1920:out_color_matrix=bt709:out_range=limited,format=yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'],
    audio: ['-c:a', 'aac', '-b:a', '256k', '-ar', 48000]
  };
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', ...opts.input, '-map', '0:v:0', '-map', '1:a:0', ...opts.video, ...opts.audio,
    '-movflags', 'faststart', '-shortest', OUT].map(String), { stdio: ['pipe', 'inherit', 'inherit'] });
  const finished = new Promise((ok, fail) => enc.on('close', code => (code ? fail(new Error(`ffmpeg exit ${code}`)) : ok())));
  const write = buf => new Promise(ok => (enc.stdin.write(buf) ? ok() : enc.stdin.once('drain', ok)));

  // each batch renders one frame per page in parallel, then writes them in order
  for (let f = 0; f < total; f += pages.length) {
    const batch = await Promise.all(pages.map((page, k) => (f + k < total
      ? page.evaluate(([i, s]) => window.framePNG(i, s), [f + k, SAMPLES]) : null)));
    for (const url of batch) if (url) await write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if (f % (FPS * 2) < pages.length) process.stdout.write(`\r[${LANG}] frame ${Math.min(total, f + pages.length)}/${total} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  enc.stdin.end();
  await finished;
  await close();
  fs.rmSync(WAV, { force: true });
  console.log(`\n[${LANG}] ${path.relative(ROOT, OUT)} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch(err => { console.error(err); process.exitCode = 1; });
