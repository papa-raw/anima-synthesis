const PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'venice';
const VENICE_URL = 'https://api.venice.ai/api/v1/chat/completions';
const VENICE_API_KEY = import.meta.env.VITE_VENICE_API_KEY;

export function getProvider() {
  return PROVIDER;
}

export function hasApiKey() {
  if (PROVIDER === 'venice') return !!VENICE_API_KEY;
  return false;
}

export async function callLLM(systemPrompt, userPrompt, options = {}) {
  if (PROVIDER === 'venice') {
    return callVenice(systemPrompt, userPrompt, options);
  }
  throw new Error(`Unknown LLM provider: ${PROVIDER}`);
}

async function callVenice(systemPrompt, userPrompt, options = {}) {
  if (!VENICE_API_KEY) throw new Error('Missing VITE_VENICE_API_KEY');

  const res = await fetch(VENICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VENICE_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || 'llama-3.3-70b',
      max_tokens: options.maxTokens || 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Venice API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
