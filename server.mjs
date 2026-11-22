/*
 * DIGI parťák – vlastní server (alternativa k Netlify).
 *  - Servíruje jen složku public/ (serverové soubory nejsou veřejné).
 *  - POST /api/ask a /api/scan → sdílená AI logika v lib/ai.mjs.
 * Spuštění:  npm install  →  ANTHROPIC_API_KEY=... npm start
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle, aiConfigured } from './lib/ai.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(), microphone=(self)');
}
function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(kind, req, res) {
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return sendJson(res, 403, { error: 'forbidden' });
  let raw;
  try { raw = await readBody(req, kind === 'scan' ? 6_000_000 : 20_000); }
  catch { return sendJson(res, 413, { error: 'too_large' }); }
  const { status, body } = await handle(kind, raw, req.socket.remoteAddress);
  return sendJson(res, status, body);
}

async function handleStatic(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { p = '/'; }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep) || p.includes('\0')) { res.writeHead(404); return res.end('Nenalezeno'); }
  try {
    const data = await readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' || p === '/sw.js' ? 'no-cache' : 'public, max-age=300'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nenalezeno');
  }
}

http.createServer((req, res) => {
  securityHeaders(res);
  const { pathname } = new URL(req.url, 'http://x');
  const m = pathname.match(/^\/api\/(ask|scan)$/);
  if (m) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method' });
    return handleApi(m[1], req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'method' });
  return handleStatic(req, res);
}).listen(PORT, HOST, () => {
  console.log(`DIGI parťák běží na http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  if (!aiConfigured()) console.log('Pozor: chybí ANTHROPIC_API_KEY – odpovědi mimo aplikaci a rozbor fotek budou vypnuté.');
});
