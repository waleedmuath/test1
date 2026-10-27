'use strict';
// Storyboard (6×2 contact sheet) and poster frame straight from a rendered cut, motion blur included.
//   node tools/storyboard.cjs [--lang ar|en]
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ROOT } = require('./browser.cjs');

const [, , ...args] = process.argv;
const i = args.indexOf('--lang');
const LANG = i >= 0 ? args[i + 1] : 'ar';
const SRC = path.join(ROOT, `out/faz3at-e5tebar-reel-${LANG}.mp4`);
const TIMES = [1.3, 3.9, 4.9, 7.9, 10.7, 13.3, 16.7, 19.6, 22.2, 25.2, 26.25, 29.9];
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);

const inputs = TIMES.flatMap(t => ['-ss', String(t), '-i', SRC]);
const scale = TIMES.map((_, k) => `[${k}:v]trim=end_frame=1,scale=360:640[v${k}]`).join(';');
const layout = TIMES.map((_, k) => `${(k % 6) * 360}_${Math.floor(k / 6) * 640}`).join('|');
ff([...inputs, '-filter_complex', `${scale};${TIMES.map((_, k) => `[v${k}]`).join('')}xstack=inputs=${TIMES.length}:layout=${layout}`,
  '-frames:v', '1', '-q:v', '3', path.join(ROOT, `out/storyboard-${LANG}.jpg`)]);
ff(['-ss', '29.9', '-i', SRC, '-frames:v', '1', '-q:v', '2', path.join(ROOT, `out/poster-${LANG}.jpg`)]);
console.log(`out/storyboard-${LANG}.jpg, out/poster-${LANG}.jpg`);
