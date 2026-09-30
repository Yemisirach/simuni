const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // CORS & PWA headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Service-Worker-Allowed', '/');

  let reqPath = decodeURI(req.url.split('?')[0]);

  // Intercept sw.js to automatically flush old service worker caches
  if (reqPath === '/sw.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=UTF-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(
      `self.addEventListener('install', (e) => { self.skipWaiting(); });\n` +
      `self.addEventListener('activate', (e) => {\n` +
      `  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.clients.claim()));\n` +
      `});\n` +
      `self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });`
    );
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists, fallback to index.html for SPA routing
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Error reading file: ' + readErr.message);
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        // Never aggressively cache HTML so updates apply immediately
        'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Simuni Mobile PWA] Serving offline-installable app on http://0.0.0.0:${PORT}`);
  console.log(`[Simuni Mobile PWA] On phone, open http://172.20.10.7:${PORT} and tap 'Install App' or 'Add to Home screen'`);
});
