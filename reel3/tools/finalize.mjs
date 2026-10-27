// Delivery encode: master render (+ mastered score) → web-friendly MP4, then poster + storyboard.
//   node tools/finalize.mjs [master.mp4] [out.mp4]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const master = path.resolve(ROOT, process.argv[2] || 'out/.patch/master.mp4');
const out = path.resolve(ROOT, process.argv[3] || 'out/jofunction-reel-3d.mp4');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', master, '-i', path.join(ROOT, 'out/score.wav'),
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-tune', 'film', '-g', '120', '-bf', '3', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' });
execFileSync('node', [path.join(ROOT, 'tools/storyboard.mjs'), out], { stdio: 'inherit' });
console.log(out);
