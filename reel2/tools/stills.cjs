'use strict';
// node tools/stills.cjs <outDir> [--lang en|ar] [--samples N] t1 t2 ...   |   --sheet from to step [cols]
const fs = require('fs'), path = require('path');
const { open } = require('./browser.cjs');
(async () => {
  const argv = process.argv.slice(2);
  const take = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : d; };
  const lang = String(take('--lang', 'en')).toLowerCase(), samples = +take('--samples', 2);
  if (!['en', 'ar'].includes(lang)) throw new Error('--lang must be en or ar');
  const [outDir, ...args] = argv;
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await open('index.html', `capture=1&lang=${lang}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  if (args[0] === '--sheet') {
    const [from, to, step, cols = 6] = args.slice(1).map(Number), times = [];
    for (let t = from; t <= to + 1e-9; t += step) times.push(+t.toFixed(4));
    const url = await page.evaluate(({ times, cols, samples }) => {
      const w = 480, h = 270, pad = 6, rows = Math.ceil(times.length / cols), sh = document.createElement('canvas');
      sh.width = cols * (w + pad) + pad; sh.height = rows * (h + pad + 18) + pad;
      const g = sh.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, sh.width, sh.height);
      times.forEach((t, i) => { renderAt(t, samples); const x = pad + (i % cols) * (w + pad), y = pad + Math.floor(i / cols) * (h + pad + 18);
        g.drawImage(document.getElementById('c'), x, y, w, h); g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(t.toFixed(2) + 's  b' + (t / 0.625).toFixed(2), x + 4, y + h + 14); });
      return sh.toDataURL('image/png');
    }, { times, cols, samples });
    const f = path.join(outDir, `sheet_${from}-${to}-${lang}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log(f);
  } else {
    for (const a of args) {
      const t = +a;
      const url = await page.evaluate(({ t, samples }) => { renderAt(t, samples); return document.getElementById('c').toDataURL('image/png'); }, { t, samples });
      const f = path.join(outDir, `still_${t.toFixed(3)}-${lang}.png`);
      fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log(f);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
