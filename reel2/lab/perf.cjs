const { open } = require('../tools/browser.cjs');
(async () => {
  for (const q of ['', 'nobloom', 'aa']) {
    const { browser, page } = await open('lab/perf.html', q);
    await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
    await page.evaluate(() => { frame(0); sync(); });
    let t0 = Date.now();
    for (let i = 0; i < 6; i++) await page.evaluate(t => { frame(t); return sync(); }, i / 60);
    const r = (Date.now() - t0) / 6;
    t0 = Date.now();
    for (let i = 0; i < 3; i++) await page.evaluate(t => { frame(t); sync(); return document.querySelector('canvas').toDataURL('image/png').length; }, i / 60);
    const p = (Date.now() - t0) / 3;
    t0 = Date.now();
    for (let i = 0; i < 3; i++) await page.evaluate(t => { frame(t); sync(); return document.querySelector('canvas').toDataURL('image/jpeg', 0.98).length; }, i / 60);
    const j = (Date.now() - t0) / 3;
    console.log(q || 'bloom(half-res)', 'render', r.toFixed(0), 'ms | +png', p.toFixed(0), 'ms | +jpeg', j.toFixed(0), 'ms');
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
