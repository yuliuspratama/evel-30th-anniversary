#!/usr/bin/env node
/* =====================================================================
   static-server.mjs — server statis kecil untuk pengujian & pratinjau
   ---------------------------------------------------------------------
   Tanpa dependensi. Melayani berkas apa adanya (tanpa rewrite), sehingga
   path relatif tetap behaves sama seperti di GitHub Pages.

   Pakai sebagai modul:
       import { startServer } from './static-server.mjs';
       const s = await startServer(rootDir);
   Jalankan langsung:
       node tools/static-server.mjs [rootDir] [port]
   ===================================================================== */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

export function startServer(rootDir, port = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      } catch {
        res.writeHead(400).end('bad request');
        return;
      }
      if (pathname.endsWith('/')) pathname += 'index.html';

      // Cegah path traversal: normalize lalu pastikan tetap di dalam root.
      const target = normalize(join(rootDir, pathname));
      if (!target.startsWith(normalize(rootDir))) {
        res.writeHead(403).end('forbidden');
        return;
      }

      let stat;
      try {
        stat = statSync(target);
        if (stat.isDirectory()) throw new Error('dir');
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
           .end('404 ' + pathname);
        return;
      }

      res.writeHead(200, {
        'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store'
      });
      createReadStream(target).pipe(res);
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const { port: actual } = server.address();
      resolve({
        port: actual,
        origin: `http://127.0.0.1:${actual}`,
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

/* CLI */
if (process.argv[1] && process.argv[1].endsWith('static-server.mjs')) {
  const root = process.argv[2] || process.cwd();
  const port = Number(process.argv[3] || 8899);
  const s = await startServer(root, port);
  console.log(`Menyajikan ${root} di ${s.origin}`);
}
