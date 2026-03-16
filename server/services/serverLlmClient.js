const VENICE_URL = 'https://api.venice.ai/api/v1/chat/completions';
const VENICE_API_KEY = process.env.VENICE_API_KEY;

export async function callVenice(systemPrompt, userPrompt, options = {}) {
  if (!VENICE_API_KEY) throw new Error('Missing VENICE_API_KEY');

  const res = await fetch(VENICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VENICE_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || 'venice-uncensored',
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
