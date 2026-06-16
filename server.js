// Standalone web app: serves the UI and an /api/ask endpoint that reuses the engine.
// Zero dependencies — built-in node:http. The API key stays here on the server.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { ask, loadConfig } from './src/assistant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url.split('?')[0];

    // --- API: ask a question / reply to an email ---
    if (req.method === 'POST' && url === '/api/ask') {
      let payload;
      try {
        payload = JSON.parse((await readBody(req)) || '{}');
      } catch {
        return json(res, 400, { error: 'Invalid request.' });
      }
      const input = String(payload.input || '').trim();
      const mode = ['auto', 'form', 'email'].includes(payload.mode) ? payload.mode : undefined;
      if (!input) return json(res, 400, { error: 'Please paste a question or an email first.' });
      try {
        const result = await ask(input, { mode });
        return json(res, 200, result);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    }

    // --- API: which provider/model is active (no secrets) ---
    if (req.method === 'GET' && url === '/api/config') {
      try {
        const cfg = loadConfig();
        return json(res, 200, { provider: cfg.provider, model: cfg.model, mode: cfg.mode });
      } catch (err) {
        return json(res, 200, { error: err.message });
      }
    }

    // --- Static files from /public ---
    if (req.method === 'GET') {
      const rel = url === '/' ? '/index.html' : url;
      const filePath = normalize(join(PUBLIC, rel));
      if (!filePath.startsWith(PUBLIC)) return json(res, 403, { error: 'Forbidden' });
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
        return res.end(data);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain' });
        return res.end('Not found');
      }
    }

    res.writeHead(405, { 'content-type': 'text/plain' });
    res.end('Method not allowed');
  } catch (err) {
    json(res, 500, { error: 'Server error: ' + err.message });
  }
});

// If the port is busy (e.g. another dev server), step up to the next one.
let attempts = 0;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && attempts < 12) {
    attempts++;
    const next = Number(PORT) + attempts;
    console.log(`  port ${Number(PORT) + attempts - 1} is busy — trying ${next}…`);
    server.listen(next);
  } else {
    console.error('  Could not start server:', err.message);
    process.exit(1);
  }
});

server.listen(Number(PORT), () => {
  const port = server.address().port;
  console.log(`\n  Job Application Assistant`);
  console.log(`  →  http://localhost:${port}\n`);
});
