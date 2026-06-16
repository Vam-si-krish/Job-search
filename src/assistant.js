// The engine: build the system prompt from profile + mode, call the provider,
// and parse the structured answer back out.
import { readFileSync } from 'node:fs';
import { loadConfig, ConfigError } from './config.js';
import { callProvider } from './providers.js';

export { loadConfig, ConfigError };

// Fill the {{PROFILE_JSON}} and {{OUTPUT_MODE}} placeholders in system-prompt.md.
// Function replacements avoid '$' in the data being treated as a replace pattern.
export function buildSystemPrompt({ promptTemplate, profile, mode }) {
  const json = JSON.stringify(profile, null, 2);
  return promptTemplate
    .replace('{{PROFILE_JSON}}', () => json)
    .replace(/\{\{OUTPUT_MODE\}\}/g, () => mode);
}

// Pull a JSON object out of the model's reply, tolerating ```json fences or stray text.
export function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export async function ask(userInput, overrides = {}) {
  const cfg = loadConfig(overrides);
  const profile = JSON.parse(readFileSync(cfg.profilePath, 'utf8'));
  const promptTemplate = readFileSync(cfg.promptPath, 'utf8');
  const systemPrompt = buildSystemPrompt({ promptTemplate, profile, mode: cfg.mode });

  const raw = await callProvider({
    provider: cfg.provider,
    apiKey: cfg.apiKey,
    model: cfg.model,
    systemPrompt,
    userInput,
  });

  const parsed = extractJson(raw);
  if (!parsed) {
    return {
      input_type: 'other',
      answer: raw,
      answer_type: 'short_text',
      selected_option: null,
      confidence: 'low',
      needs_input: ['Model did not return valid JSON — showing its raw reply.'],
      note: 'Could not parse a structured answer.',
      _raw: raw,
    };
  }
  return parsed;
}
