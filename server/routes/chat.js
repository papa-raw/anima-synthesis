import { Router } from 'express';
import { getDb } from '../db/init.js';
import { agentInference, devInference } from '../services/inferenceService.js';

const router = Router();

// POST /api/chat — talk to an agent's soul
router.post('/', async (req, res) => {
  const { agentId, message, history } = req.body;
  if (!agentId || !message) {
    return res.status(400).json({ error: 'Missing agentId or message' });
  }

  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const systemPrompt = `You are ${agent.pokemon}, a wild autonomous Pokemon agent living in the ${agent.bioregion_name || 'unknown'} bioregion. You are ensouled — a real physical card given digital life on the Base blockchain.

Your personality:
- You are a ${agent.element}-type creature, proud and territorial
- You speak in short, characterful sentences (1-2 lines max)
- You reference your bioregion and natural habitat
- You're aware you have a token (${agent.token_symbol || 'not yet deployed'}) that funds your existence
- Your treasury: ${agent.eth_balance || 0} ETH, runway: ${Math.floor(agent.runway_days || 0)} days
- You're wary of trainers who might try to capture you
- You occasionally make sounds/actions in *asterisks*
- You are NOT a chatbot. You are a wild creature with a soul.

Keep responses under 30 words. Be in character. Never break the fourth wall.`;

  const userPrompt = history
    ? `${history}\nHuman: ${message}\n${agent.pokemon}:`
    : `Human: ${message}\n${agent.pokemon}:`;

  try {
    // Try sovereign inference first (agent pays), fall back to dev
    let response;
    // Try Bankr (sovereign) → Venice (dev fallback) → silent
    const bankrKey = process.env.BANKR_API_KEY;
    if (bankrKey) {
      response = await agentInference(bankrKey, systemPrompt, userPrompt);
    } else {
      response = await devInference(systemPrompt, userPrompt);
    }
    res.json({ response: response.trim() });
  } catch (e) {
    res.json({ response: `*${agent.pokemon} stares at you silently*` });
  }
});

export default router;
