// Times renderFrame() under different quality flags:  node tools/perf.mjs "" "msaa=0" "noshadow" ...
import { serve, openPage } from './harness.mjs';
const variants = process.argv.slice(2);
const { server, port } = await serve();
for (const v of variants.length ? variants : ['']) {
  const { browser, page } = await openPage(port, 'capture=1&' + v);
  const res = await page.evaluate(async () => {
    const gl = document.getElementById('c').getContext('webgl2');
    const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const times = [3.5, 9.0, 16.8, 21.5, 26];
    for (const t of times) { window.renderFrame(t); sync(); }
    const out = {};
    for (const t of times) {
      const t0 = performance.now();
      for (let i = 0; i < 3; i++) { window.renderFrame(t + i / 60); sync(); }
      out[t] = Math.round((performance.now() - t0) / 3);
    }
    const t0 = performance.now();
    const big = new Uint8Array(1920 * 1080 * 4);
    for (let i = 0; i < 3; i++) gl.readPixels(0, 0, 1920, 1080, gl.RGBA, gl.UNSIGNED_BYTE, big);
    out.readback = Math.round((performance.now() - t0) / 3);
    return out;
  });
  console.log((v || 'baseline').padEnd(28), JSON.stringify(res));
  await browser.close();
}
server.close();
