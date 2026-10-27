// Master the score: measure integrated loudness, apply one static gain to hit
// -14 LUFS, then a transparent -1 dBTP ceiling.   node tools/master.mjs [in] [out]
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './harness.mjs';

const src = path.resolve(ROOT, process.argv[2] || 'out/score_raw.wav');
const dst = path.resolve(ROOT, process.argv[3] || 'out/score.wav');
const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', 'loudnorm=I=-14:TP=-1:LRA=18:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(probe.stderr.slice(probe.stderr.lastIndexOf('{'), probe.stderr.lastIndexOf('}') + 1));
const gain = -14 - Number(m.input_i);
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.83:attack=1.5:release=50:level=false`, '-ar', '48000', '-c:a', 'pcm_s16le', dst]);
const check = spawnSync('ffmpeg', ['-hide_banner', '-i', dst, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
const c = JSON.parse(check.stderr.slice(check.stderr.lastIndexOf('{'), check.stderr.lastIndexOf('}') + 1));
console.log(`${path.relative(ROOT, dst)}: ${m.input_i} → ${c.input_i} LUFS, true peak ${c.input_tp} dBTP`);
