// Netlify serverless function — the /api/ask endpoint.
// The engine is imported *inside* the handler so any load error returns as
// readable JSON (HTTP 500) instead of an opaque 502 Bad Gateway.
const headers = { 'content-type': 'application/json' };

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { ask } = await import('../../src/assistant.js');

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request.' }) };
    }

    const input = String(payload.input || '').trim();
    const mode = ['auto', 'form', 'email'].includes(payload.mode) ? payload.mode : undefined;
    if (!input) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please paste a question or an email first.' }) };
    }

    const result = await ask(input, { mode });
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};
