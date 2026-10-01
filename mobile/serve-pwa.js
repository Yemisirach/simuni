const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8082;
const DIST_DIR = path.join(__dirname, 'dist');
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:3010';

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

  if (reqPath.startsWith('/api/')) {
    const target = new URL(req.url, API_TARGET);
    const proxyReq = http.request(
      target,
      {
        method: req.method,
        headers: { ...req.headers, host: target.host },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (error) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Backend unavailable: ${error.message}` }));
    });
    req.pipe(proxyReq);
    return;
  }

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

      let outputData = data;
      if (isHtml) {
        let htmlStr = data.toString('utf8');
        // Unregister any stale service workers and caches from previous sessions
        const swCleaner = `<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    for (var r of regs) { r.unregister(); }
  });
}
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (var n of names) { caches.delete(n); }
  });
}
</script>`;
        const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n`;
        htmlStr = htmlStr.replace('</head>', fontLinks + swCleaner + '</head>');
        // Cache bust script bundle references
        htmlStr = htmlStr.replace(/src="([^"]+\.js)"/g, 'src="$1?v=' + Date.now() + '"');
        outputData = Buffer.from(htmlStr, 'utf8');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        // Never aggressively cache HTML/JS so updates apply immediately
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.end(outputData);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Simuni Mobile PWA] Serving offline-installable app on http://0.0.0.0:${PORT}`);
  console.log(`[Simuni Mobile PWA] On phone, open http://172.20.10.7:${PORT} and tap 'Install App' or 'Add to Home screen'`);
});
