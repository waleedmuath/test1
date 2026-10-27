// Offline render → MP4. Each worker is its own headless Chromium rendering a
// contiguous range of frames; frames stream as raw RGBA over localhost into
// one ffmpeg per worker, then the segments are joined and the score is muxed.
//
//   node tools/render.mjs [--fps 60] [--scale 1] [--from 0] [--to 30] [--workers 3]
//                         [--crf 16] [--preset slow] [--audio out/score.wav] [--out out/reel.mp4]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { serve, openPage, ROOT } from './harness.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const FPS = +opt('fps', 60), SCALE = +opt('scale', 1), WORKERS = +opt('workers', 3);
const FROM = +opt('from', 0), TO = +opt('to', 30);
const CRF = opt('crf', '16'), PRESET = opt('preset', 'slow');
const OUT = path.resolve(ROOT, opt('out', 'out/jofunction-reel-3d.mp4'));
const AUDIO = opt('audio', fs.existsSync(path.join(ROOT, 'out/score.wav')) ? path.join(ROOT, 'out/score.wav') : null);
const WORK = path.join(ROOT, 'out/.work');
fs.mkdirSync(WORK, { recursive: true });

const first = Math.round(FROM * FPS), last = Math.round(TO * FPS); // [first, last)
const total = last - first;
const per = Math.ceil(total / WORKERS);
const W = Math.round(1920 * SCALE), H = Math.round(1080 * SCALE);

function ffmpeg(args, stdin = false) {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  return { p, done };
}

const sinks = {};
const { server, port } = await serve(sinks);
const t0 = Date.now();
let doneFrames = 0;

async function worker(k) {
  const a = first + k * per, b = Math.min(last, a + per);
  if (a >= b) return null;
  const seg = path.join(WORK, `seg_${k}.mp4`);
  const ff = ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', '-',
    '-vf', 'vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF, '-g', String(FPS * 2), '-bf', '2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', seg], true);
  sinks[k] = buf => new Promise((res, rej) => {
    if (buf.length !== W * H * 4) return rej(new Error(`bad frame size ${buf.length}`));
    ff.p.stdin.write(buf, e => (e ? rej(e) : res()));
  });
  const { browser, page } = await openPage(port, `capture=1&scale=${SCALE}`);
  for (let i = a; i < b; i++) {
    await page.evaluate(([i, k, fps]) => window.captureFrame(i, `/frame/${k}`, fps), [i, k, FPS]);
    doneFrames++;
    if (doneFrames % 30 === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stdout.write(`  ${doneFrames}/${total} frames · ${el.toFixed(0)}s · eta ${((el / doneFrames) * (total - doneFrames)).toFixed(0)}s\n`);
    }
  }
  ff.p.stdin.end();
  await ff.done;
  await browser.close();
  return seg;
}

console.log(`Rendering ${total} frames (${FROM}–${TO}s @ ${FPS} fps, ${W}×${H}) on ${WORKERS} workers…`);
const segs = (await Promise.all(Array.from({ length: WORKERS }, (_, k) => worker(k)))).filter(Boolean);
server.close();
const list = path.join(WORK, 'segments.txt');
fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n') + '\n');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const muxArgs = ['-f', 'concat', '-safe', '0', '-i', list];
if (AUDIO) muxArgs.push('-ss', String(FROM), '-t', String(TO - FROM), '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest');
muxArgs.push('-c:v', 'copy', '-movflags', '+faststart', OUT);
await ffmpeg(muxArgs).done;
console.log(`${OUT}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
