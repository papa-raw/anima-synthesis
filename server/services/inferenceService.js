/**
 * Inference Service — Sovereign agent inference via Bankr LLM Gateway
 *
 * Architecture:
 *   Agent WETH earnings → Bankr API key → Bankr Gateway → Venice models → response
 *
 * Bankr Gateway is OpenAI-compatible at llm.bankr.bot
 * Routes to Venice models (satisfies Venice bounty)
 * Self-sustaining economics (satisfies Bankr bounty)
 *
 * Fallback chain: Bankr → Venice direct → silent
 */

const BANKR_URL = 'https://llm.bankr.bot/v1/chat/completions';
const VENICE_URL = 'https://api.venice.ai/api/v1/chat/completions';

/**
 * Primary: Bankr LLM Gateway (agent-funded, sovereign)
 * Uses Venice models via Bankr routing
 */
export async function agentInference(bankrApiKey, systemPrompt, userPrompt, options = {}) {
  if (!bankrApiKey) throw new Error('No Bankr API key — agent cannot pay for inference');

  const res = await fetch(BANKR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': bankrApiKey
    },
    body: JSON.stringify({
      model: options.model || 'venice-uncensored',
      max_tokens: options.maxTokens || 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bankr inference failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Fallback: Venice direct (dev-funded, for development/testing)
 */
export async function devInference(systemPrompt, userPrompt, options = {}) {
  const key = process.env.VENICE_API_KEY;
  if (!key) return '*stares silently*';

  try {
    const res = await fetch(VENICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'venice-uncensored',
        max_tokens: options.maxTokens || 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content;
  } catch {
    return '*stares silently*';
  }
}
