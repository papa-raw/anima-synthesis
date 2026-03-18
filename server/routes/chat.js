import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/init.js';
import { agentInference, devInference } from '../services/inferenceService.js';
import { generateMemoryArt } from '../services/memoryArt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSoul(agentId) {
  try {
    return readFileSync(join(__dirname, '..', 'souls', `${agentId}.md`), 'utf8');
  } catch {
    return null;
  }
}

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

  // Load soul file
  const soul = loadSoul(agentId);

  // Load agent's memories (most important + most recent)
  const memories = db.prepare(
    'SELECT content, memory_type, trainer_wallet, trainer_name FROM agent_memories WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT 10'
  ).all(agentId);

  // Load memories about this specific trainer
  const trainerWallet = req.body.walletAddress || 'unknown';
  const trainerMemories = db.prepare(
    'SELECT content, memory_type, trainer_name FROM agent_memories WHERE agent_id = ? AND trainer_wallet = ? ORDER BY created_at DESC LIMIT 5'
  ).all(agentId, trainerWallet);

  const memoryContext = memories.length > 0
    ? `\n\nYour memories:\n${memories.map(m => `- [${m.memory_type}]${m.trainer_name ? ` (about ${m.trainer_name})` : ''} ${m.content}`).join('\n')}`
    : '';

  const trainerContext = trainerMemories.length > 0
    ? `\n\nYou remember this visitor (${trainerWallet.slice(0, 8)}...):\n${trainerMemories.map(m => `- ${m.content}`).join('\n')}`
    : `\n\nThis is a new visitor you haven't met before (${trainerWallet.slice(0, 8)}...).`;

  const systemPrompt = soul
    ? `${soul}\n\n---\nCurrent state: ${agent.status}, treasury: ${agent.eth_balance || 0} ETH, runway: ${Math.floor(agent.runway_days || 0)} days${memoryContext}${trainerContext}\n\nRespond in 1-3 sentences. Stay in character.`
    : `You are ${agent.pokemon}, a wild autonomous Pokemon agent in ${agent.bioregion_name}. Status: ${agent.status}. Treasury: ${agent.eth_balance || 0} ETH.${memoryContext}${trainerContext}\n\nRespond in 1-3 sentences. Be in character.`;

  const userPrompt = history
    ? `${history}\nHuman: ${message}\n${agent.pokemon}:`
    : `Human: ${message}\n${agent.pokemon}:`;

  try {
    let response;
    const bankrKey = process.env.BANKR_API_KEY;
    if (bankrKey) {
      response = await agentInference(bankrKey, systemPrompt, userPrompt);
    } else {
      response = await devInference(systemPrompt, userPrompt);
    }

    const trimmed = response.trim();

    // Distill memory from this encounter (async, don't block response)
    distillMemory(db, agentId, agent.pokemon, message, trimmed, trainerWallet).catch(() => {});

    res.json({ response: trimmed });
  } catch (e) {
    res.json({ response: `*${agent.pokemon} stares at you silently*` });
  }
});

/**
 * Distill a memory from a conversation exchange.
 * The agent decides what's worth remembering.
 */
async function distillMemory(db, agentId, pokemon, humanMessage, agentResponse, trainerWallet) {
  // Only store memories from substantive exchanges (not greetings)
  if (humanMessage.length < 10) return;

  try {
    const bankrKey = process.env.BANKR_API_KEY;
    const inferFn = bankrKey ? agentInference.bind(null, bankrKey) : devInference;

    const distillPrompt = `You are ${pokemon}'s memory system. Given this exchange, decide if it's worth remembering. If yes, output a single sentence memory. If not, output "SKIP".

Human said: "${humanMessage}"
${pokemon} said: "${agentResponse}"

Rules:
- Only remember things that affect the soul: threats, kindness, questions about identity, mentions of capture, conservation, bioregion
- Output ONLY the memory sentence or "SKIP". Nothing else.
- Memory should be from ${pokemon}'s perspective: "A human asked me about..." or "Someone threatened to capture me..."`;

    const memory = await inferFn(distillPrompt, 'Distill this exchange into a memory or SKIP.', { maxTokens: 50 });
    const cleaned = memory.trim();

    if (cleaned && cleaned !== 'SKIP' && cleaned.length > 5 && cleaned.length < 200) {
      const result = db.prepare(
        'INSERT INTO agent_memories (agent_id, memory_type, content, emotional_valence, importance, trainer_wallet, source) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(agentId, 'encounter', cleaned, 0, 0.5, trainerWallet, 'conversation');

      // Generate memory art (async, don't block)
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
      if (agent) {
        generateMemoryArt(agent, cleaned).then(art => {
          if (art) {
            db.prepare('UPDATE agent_memories SET art_url = ?, art_ipfs_cid = ?, art_prompt = ? WHERE id = ?')
              .run(art.imageUrl, art.ipfsCid, art.prompt, result.lastInsertRowid);
          }
        }).catch(() => {});
      }

      // Compress if too many memories
      await compressMemories(db, agentId, pokemon);
    }
  } catch {
    // Memory distillation is best-effort, never blocks
  }
}

const MAX_MEMORIES = 20;
const COMPRESS_BATCH = 10;

async function compressMemories(db, agentId, pokemon) {
  const count = db.prepare('SELECT COUNT(*) as c FROM agent_memories WHERE agent_id = ?').get(agentId).c;
  if (count <= MAX_MEMORIES) return;

  // Get oldest memories to compress
  const oldest = db.prepare(
    'SELECT id, content, memory_type, trainer_name FROM agent_memories WHERE agent_id = ? AND memory_type != ? ORDER BY created_at ASC LIMIT ?'
  ).all(agentId, 'reflection', COMPRESS_BATCH);

  if (oldest.length < COMPRESS_BATCH) return;

  try {
    const bankrKey = process.env.BANKR_API_KEY;
    const inferFn = bankrKey ? agentInference.bind(null, bankrKey) : devInference;

    const memoriesText = oldest.map(m => `- ${m.content}`).join('\n');
    const reflection = await inferFn(
      `You are ${pokemon}'s deep memory. Compress these ${oldest.length} memories into 2-3 sentences that capture the essence. Write from ${pokemon}'s perspective.`,
      `Memories to compress:\n${memoriesText}`,
      { maxTokens: 100 }
    );

    const cleaned = reflection.trim();
    if (cleaned && cleaned.length > 10) {
      // Store the reflection
      db.prepare(
        'INSERT INTO agent_memories (agent_id, memory_type, content, importance, source) VALUES (?, ?, ?, ?, ?)'
      ).run(agentId, 'reflection', cleaned, 0.8, 'memory_compression');

      // Delete the originals
      const ids = oldest.map(m => m.id);
      db.prepare(`DELETE FROM agent_memories WHERE id IN (${ids.join(',')})`).run();
    }
  } catch {
    // Compression failure is fine — memories just stay uncompressed
  }
}

export default router;
