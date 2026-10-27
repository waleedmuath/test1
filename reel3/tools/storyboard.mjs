// Poster + 4×4 storyboard from the finished MP4.   node tools/storyboard.mjs [video]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { ROOT } from './harness.mjs';

const video = path.resolve(ROOT, process.argv[2] || 'out/jofunction-reel-3d.mp4');
const out = path.dirname(video);
const times = [1.75, 3.6, 4.35, 4.98, 5.55, 6.5, 7.6, 9.3, 11.1, 13.1, 15.35, 16.9, 19.5, 21.5, 24.3, 27.5];
const tmp = path.join(out, '.work', 'board');
fs.mkdirSync(tmp, { recursive: true });
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
times.forEach((t, i) => ff(['-ss', String(t), '-i', video, '-frames:v', '1', '-vf', 'scale=480:270', path.join(tmp, `f${String(i).padStart(2, '0')}.png`)]));
ff(['-framerate', '1', '-i', path.join(tmp, 'f%02d.png'), '-vf', 'tile=4x4:padding=6:color=0x0B0B0C', '-frames:v', '1', '-q:v', '3', path.join(out, 'storyboard.jpg')]);
ff(['-ss', '27.5', '-i', video, '-frames:v', '1', '-q:v', '2', path.join(out, 'poster.jpg')]);
console.log(path.join(out, 'storyboard.jpg'), path.join(out, 'poster.jpg'));
