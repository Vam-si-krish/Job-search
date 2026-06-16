// Netlify serverless function — the /api/config endpoint (active provider/model, no secrets).
// Engine imported inside the handler so any load error returns as readable JSON, not a 502.
const headers = { 'content-type': 'application/json' };

export const handler = async () => {
  try {
    const { loadConfig } = await import('../../src/assistant.js');
    const cfg = loadConfig();
    return { statusCode: 200, headers, body: JSON.stringify({ provider: cfg.provider, model: cfg.model, mode: cfg.mode }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: String((err && err.message) || err) }) };
  }
};
