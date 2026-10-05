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
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
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

  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists, fallback to PWA root files or index.html for SPA routing
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (reqPath === '/manifest.json') filePath = path.join(__dirname, 'manifest.json');
      else if (reqPath === '/sw.js') filePath = path.join(__dirname, 'sw.js');
      else if (reqPath === '/icon-192.png') filePath = path.join(__dirname, 'assets', 'icon-192.png');
      else if (reqPath === '/icon-512.png') filePath = path.join(__dirname, 'assets', 'icon-512.png');
      else filePath = path.join(DIST_DIR, 'index.html');
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

        // Comprehensive PWA tags and fonts
        const pwaHeaders = `
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1A1A1A">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Simuni">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
`;

        const pwaInstaller = `
<!-- Simuni 1-Tap PWA Installer Banner -->
<div id="simuni-install-banner" style="display:none; position:fixed; bottom:20px; left:16px; right:16px; max-width:440px; margin:0 auto; background:#1A1A1A; border:1px solid #C4A35A; border-radius:14px; padding:12px 16px; box-shadow:0 10px 25px rgba(0,0,0,0.5); z-index:999999; align-items:center; justify-content:space-between; font-family:-apple-system,BlinkMacSystemFont,Roboto,sans-serif;">
  <div style="display:flex; align-items:center; gap:12px;">
    <img src="/icon-192.png" style="width:38px; height:38px; border-radius:8px; border:1px solid #C4A35A;">
    <div>
      <div style="font-weight:700; font-size:13px; color:#FFFFFF;">Install Simuni Agent</div>
      <div style="font-size:11px; color:#A0A0A0;">Add to Home Screen as Native App</div>
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:8px;">
    <button id="simuni-install-btn" style="background:#C4A35A; color:#1A1A1A; border:none; border-radius:8px; padding:8px 14px; font-weight:700; font-size:12px; cursor:pointer;">Install</button>
    <button id="simuni-install-close" style="background:transparent; color:#888; border:none; font-size:16px; cursor:pointer; padding:4px;">✕</button>
  </div>
</div>

<script>
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => console.log('[Simuni PWA] Service worker active:', reg.scope))
        .catch((err) => console.error('[Simuni PWA] Service worker failed:', err));
    });
  }

  // Handle Chrome / Android PWA Installation Prompt
  let simuniPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    simuniPrompt = e;
    const banner = document.getElementById('simuni-install-banner');
    if (banner) banner.style.display = 'flex';
  });

  document.getElementById('simuni-install-btn')?.addEventListener('click', async () => {
    if (!simuniPrompt) return;
    simuniPrompt.prompt();
    const { outcome } = await simuniPrompt.userChoice;
    console.log('[Simuni PWA] User response:', outcome);
    simuniPrompt = null;
    const banner = document.getElementById('simuni-install-banner');
    if (banner) banner.style.display = 'none';
  });

  document.getElementById('simuni-install-close')?.addEventListener('click', () => {
    const banner = document.getElementById('simuni-install-banner');
    if (banner) banner.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('simuni-install-banner');
    if (banner) banner.style.display = 'none';
    console.log('[Simuni PWA] App successfully installed on device!');
  });
</script>
`;

        htmlStr = htmlStr.replace('</head>', pwaHeaders + '</head>');
        htmlStr = htmlStr.replace('</body>', pwaInstaller + '</body>');
        // Cache bust script bundle references
        htmlStr = htmlStr.replace(/src="([^"]+\.js)"/g, 'src="$1?v=' + Date.now() + '"');
        outputData = Buffer.from(htmlStr, 'utf8');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': filePath.endsWith('sw.js') ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
      });
      res.end(outputData);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Simuni Mobile PWA] Serving offline-installable app on http://0.0.0.0:${PORT}`);
  console.log(`[Simuni Mobile PWA] On Android phone, open http://172.20.10.7:${PORT} to install!`);
});
