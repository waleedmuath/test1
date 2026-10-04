'use strict';
// Usage: node tools/stills.cjs <outDir> <t1> <t2> ...        → one PNG per time
//        node tools/stills.cjs <outDir> --sheet <from> <to> <step> [cols]  → contact sheet
const fs = require('fs');
const path = require('path');
const { openReel } = require('./browser.cjs');

(async () => {
  const [outDir, ...args] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await openReel();
  if (args[0] === '--sheet') {
    const [from, to, step, cols = 6] = args.slice(1).map(Number);
    const times = [];
    for (let t = from; t <= to + 1e-9; t += step) times.push(+t.toFixed(4));
    const url = await page.evaluate(({ times, cols }) => {
      const w = 480, h = 270, pad = 6, rows = Math.ceil(times.length / cols);
      const sheet = document.createElement('canvas');
      sheet.width = cols * (w + pad) + pad; sheet.height = rows * (h + pad + 18) + pad;
      const g = sheet.getContext('2d');
      g.fillStyle = '#222'; g.fillRect(0, 0, sheet.width, sheet.height);
      times.forEach((t, i) => {
        renderAt(t, 2);
        const x = pad + (i % cols) * (w + pad), y = pad + Math.floor(i / cols) * (h + pad + 18);
        g.drawImage(document.getElementById('c'), x, y, w, h);
        g.fillStyle = '#fff'; g.font = '13px monospace'; g.fillText(t.toFixed(2) + 's', x + 4, y + h + 14);
      });
      return sheet.toDataURL('image/png');
    }, { times, cols });
    const f = path.join(outDir, `sheet_${from}-${to}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    console.log(f);
  } else {
    for (const a of args) {
      const t = Number(a);
      const url = await page.evaluate(t => { renderAt(t, 4); return document.getElementById('c').toDataURL('image/png'); }, t);
      const f = path.join(outDir, `still_${t.toFixed(3)}.png`);
      fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
      console.log(f);
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
