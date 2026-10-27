'use strict';
// Local player: node tools/serve.cjs [port] → http://127.0.0.1:8080 (fonts need HTTP, not file://)
const { serve } = require('./browser.cjs');

const port = Number(process.argv[2]) || 8080;
serve(port).then(() => console.log(`Faz3at E5tebar reel → http://127.0.0.1:${port}/  (add ?lang=en for English)`));
