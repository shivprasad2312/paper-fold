/* Minimal static file server for local dev / preview (no dependencies). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400).end('bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    // An HTML page gets its script and style URLs stamped with the edit time of
    // each file. A cached copy of an old js/ui.js is how the unlock button once
    // rendered with nothing behind it; a URL that changes with the file cannot
    // go stale, on the dev server or through a preview proxy.
    if (ext === '.html') {
      const stamp = (name) => {
        try { return Math.round(fs.statSync(path.join(ROOT, name)).mtimeMs); } catch (e) { return 0; }
      };
      data = Buffer.from(String(data).replace(/\b(src|href)="((?:js|css)\/[^"?]+)"/g,
        (m, attr, name) => attr + '="' + name + '?v=' + stamp(name) + '"'));
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Happy Glass clone running at http://${HOST}:${PORT}`);
});
