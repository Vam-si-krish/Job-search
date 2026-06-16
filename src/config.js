// Loads settings from .env (or the real environment) with zero dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

  const envFileExists = existsSync(resolve(ROOT, '.env'));
  const apiKey = overrides.apiKey || get(keyName);

  if (!envFileExists && !apiKey) {
    throw new ConfigError(
      `No .env file found.\nRun:  cp .env.example .env\nThen open .env and paste your ${keyName}.`
    );
  }
  if (!apiKey) {
    throw new ConfigError(
      `Missing ${keyName} in .env.\nOpen .env and paste your API key for provider "${provider}".`
    );
  }

  return {
    provider,
    apiKey,
    model: overrides.model || get('AI_MODEL', 'claude-sonnet-4-6'),
    mode: overrides.mode || get('OUTPUT_MODE', 'auto'),
    profilePath: resolve(ROOT, get('PROFILE_PATH', './profile.json')),
    promptPath: resolve(ROOT, get('SYSTEM_PROMPT_PATH', './system-prompt.md')),
    root: ROOT,
  };
}
