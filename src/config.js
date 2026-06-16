// Loads settings from .env (or the real environment) with zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// import.meta.url can be unavailable once bundled into a serverless function —
// never let that crash the module at load time.
let __dirname;
try {
  __dirname = dirname(fileURLToPath(import.meta.url));
} catch {
  __dirname = process.cwd();
}
const ROOT = (() => {
  try { return resolve(__dirname, '..'); } catch { return process.cwd(); }
})();

// Find a data file, preferring the current working directory — works for the local
// server, the CLI, and bundled serverless functions (where files sit at the task root).
function locate(preferred, fallbackName) {
  const tries = [];
  if (preferred) {
    tries.push(resolve(process.cwd(), preferred));
    tries.push(resolve(ROOT, preferred));
  }
  tries.push(resolve(process.cwd(), fallbackName));
  tries.push(resolve(ROOT, fallbackName));
  for (const p of tries) {
    try { if (existsSync(p)) return p; } catch {}
  }
  return tries[0];
}

export class ConfigError extends Error {}

// --- tiny .env parser (KEY=value, # comments, optional quotes) ---
function loadEnvFile() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = loadEnvFile();
const get = (key, fallback = '') => process.env[key] ?? fileEnv[key] ?? fallback;

const PROVIDER_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

export function loadConfig(overrides = {}) {
  const provider = String(overrides.provider || get('AI_PROVIDER', 'anthropic')).toLowerCase();
  const keyName = PROVIDER_KEYS[provider];
  if (!keyName) {
    throw new ConfigError(
      `Unknown AI_PROVIDER "${provider}". Choose one of: ${Object.keys(PROVIDER_KEYS).join(', ')}`
    );
  }

  const apiKey = overrides.apiKey || get(keyName);
  if (!apiKey) {
    throw new ConfigError(
      `Missing ${keyName}.\n` +
      `• Local: copy .env.example to .env and paste your key.\n` +
      `• Deployed (Netlify / Render / etc.): set ${keyName} as an environment variable in the host's dashboard.`
    );
  }

  return {
    provider,
    apiKey,
    model: overrides.model || get('AI_MODEL', 'claude-sonnet-4-6'),
    mode: overrides.mode || get('OUTPUT_MODE', 'auto'),
    profilePath: locate(get('PROFILE_PATH', ''), 'profile.json'),
    promptPath: locate(get('SYSTEM_PROMPT_PATH', ''), 'system-prompt.md'),
    root: ROOT,
  };
}
