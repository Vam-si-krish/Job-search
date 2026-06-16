// One small adapter per AI provider. Uses native fetch (Node 18+), no SDKs.

const OPENAI_COMPATIBLE = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com',
};

export async function callProvider(opts) {
  const { provider } = opts;
  if (provider === 'anthropic') return callAnthropic(opts);
  if (provider === 'google') return callGoogle(opts);
  if (OPENAI_COMPATIBLE[provider]) return callOpenAICompatible({ ...opts, baseUrl: OPENAI_COMPATIBLE[provider] });
  throw new Error(`Unsupported provider: ${provider}`);
}

async function callAnthropic({ apiKey, model, systemPrompt, userInput, maxTokens = 1500, temperature = 0.2 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }],
    }),
  });
  await throwIfBad(res, 'Anthropic');
  const data = await res.json();
  return (data.content || []).map((b) => b.text || '').join('');
}

async function callOpenAICompatible({ baseUrl, apiKey, model, systemPrompt, userInput, maxTokens = 1500, temperature = 0.2 }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ],
    }),
  });
  await throwIfBad(res, 'OpenAI-compatible');
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGoogle({ apiKey, model, systemPrompt, userInput, maxTokens = 1500, temperature = 0.2 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userInput }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  });
  await throwIfBad(res, 'Google');
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
}

async function throwIfBad(res, label) {
  if (res.ok) return;
  let detail = '';
  try {
    detail = JSON.stringify(await res.json());
  } catch {
    detail = await res.text().catch(() => '');
  }
  throw new Error(`${label} API error ${res.status}: ${String(detail).slice(0, 500)}`);
}
