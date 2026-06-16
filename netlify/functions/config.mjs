// Netlify serverless function — the /api/config endpoint (active provider/model, no secrets).
import { loadConfig } from '../../src/assistant.js';

const headers = { 'content-type': 'application/json' };

export const handler = async () => {
  try {
    const cfg = loadConfig();
    return { statusCode: 200, headers, body: JSON.stringify({ provider: cfg.provider, model: cfg.model, mode: cfg.mode }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message }) };
  }
};
