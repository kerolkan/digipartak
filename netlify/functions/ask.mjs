/* Netlify Function: POST /api/ask → sdílená logika v lib/ai.mjs */
import { handle } from '../../lib/ai.mjs';

export default async (req, context) => {
  const json = (status, body) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { error: 'forbidden' });
  const raw = await req.text();
  if (raw.length > 6_000_000) return json(413, { error: 'too_large' });
  const { status, body } = await handle('ask', raw, context.ip);
  return json(status, body);
};

export const config = { path: '/api/ask' };
