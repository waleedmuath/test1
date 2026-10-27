'use strict';
// Serves the project folder on localhost and opens capture pages in headless Chromium.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(id); } catch (e) { /* try the next location */ }
  }
  throw new Error('Playwright not found — run `npm install` first');
}

function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok(server)));
}

// returns { pages, close } with `count` ready capture pages for the given language
async function launch(lang, count = 1) {
  const { chromium } = loadPlaywright();
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/index.html?capture&lang=${lang}`;
  const browser = await chromium.launch();
  const pages = await Promise.all(Array.from({ length: count }, async () => {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    page.on('pageerror', e => console.error('[page]', e.message));
    page.on('console', m => m.type() === 'error' && console.error('[console]', m.text()));
    await page.goto(url);
    await page.waitForFunction('window.READY', null, { timeout: 60_000 });
    return page;
  }));
  return { pages, close: async () => { await browser.close(); server.close(); } };
}

module.exports = { launch, serve, ROOT };
