/**
 * Agent Logger — appends structured execution events to agent_log.json
 * Protocol Labs bounty requires live, verifiable execution logs showing
 * decisions, tool calls, retries, failures, and final outputs.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '../../agent_log.json');

function getLog() {
  try {
    return JSON.parse(readFileSync(LOG_PATH, 'utf8'));
  } catch {
    return { "$schema": "https://erc8004.org/schema/agent_log.json", agentName: "Anima", events: [] };
  }
}

function saveLog(log) {
  // Keep last 200 events to prevent unbounded growth
  if (log.events.length > 200) {
    log.events = log.events.slice(-200);
  }
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

/**
 * Log an agent event
 * @param {string} agentId - e.g. 'agent-phanpy'
 * @param {string} type - heartbeat, fee_claim, capture, release, chat, memory_art, nft_mint, error
 * @param {object} data - event-specific data
 */
export function logAgentEvent(agentId, type, data = {}) {
  try {
    const log = getLog();
    log.events.push({
      time: new Date().toISOString(),
      agent: agentId,
      type,
      ...data
    });
    saveLog(log);
  } catch (e) {
    // Logging should never break the app
    console.warn('Agent log write failed:', e.message);
  }
}
