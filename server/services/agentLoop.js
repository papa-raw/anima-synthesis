import { getEthBalance, getClaimableFees, claimFees, getEthPrice, getWethBalance, getTokenHolderCount } from './clankerService.js';
import { pinToIpfs } from './ipfsService.js';

const TICK_INTERVAL = 30 * 60 * 1000; // 30 minutes
const GAS_COST = 0.0001; // ~$0.006 on Base

export function startAgentLoops(db) {
  const agents = db.prepare('SELECT * FROM agents WHERE status != ?').all('dead');
  if (agents.length === 0) {
    console.log('No active agents to run loops for');
    return;
  }

  console.log(`Starting autonomy loops for ${agents.length} agents`);
  agents.forEach(agent => {
    // Initial tick after 5s delay (let server start)
    setTimeout(() => runAgentTick(agent, db), 5000);
    // Recurring
    setInterval(() => {
      // Re-fetch agent state each tick
      const fresh = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id);
      if (fresh && fresh.status !== 'dead') {
        runAgentTick(fresh, db);
      }
    }, TICK_INTERVAL);
  });
}

async function runAgentTick(agent, db) {
  let action = 'heartbeat';
  let txHash = null;
  let ethBalance = 0;
  let claimable = 0;
  let runwayDays = 0;

  try {
    // 1. Check ETH balance
    ethBalance = await getEthBalance(agent.wallet_address);
    if (!agent.wallet_address) {
      console.log(`[${agent.id}] No wallet address, skipping tick`);
      return;
    }

    // 2. Check claimable fees (only if token deployed)
    if (agent.token_address) {
      claimable = await getClaimableFees(agent.id, agent.token_address);
    }

    // 3. Claim if profitable
    if (claimable > GAS_COST + 0.0005 && agent.token_address) {
      txHash = await claimFees(agent.id, agent.token_address);
      if (txHash) action = 'fee_claim';
    } else if (ethBalance < 0.001 && claimable > 0 && agent.token_address) {
      // Survival mode: claim any fees when ETH critically low
      txHash = await claimFees(agent.id, agent.token_address);
      if (txHash) action = 'survival_mode';
    }

    // 4. Re-check balance after potential claim
    if (action === 'fee_claim' || action === 'survival_mode') {
      ethBalance = await getEthBalance(agent.wallet_address);
    }

    // 5. Calculate runway
    const ethPrice = await getEthPrice();
    const dailyCost = agent.daily_cost_usd || 0.50;
    runwayDays = dailyCost > 0 ? (ethBalance * ethPrice) / dailyCost : 999;

    // 6. Check death (only if agent was previously funded)
    if (ethBalance === 0 && claimable === 0 && agent.eth_balance > 0) {
      db.prepare('UPDATE agents SET status = ? WHERE id = ?').run('dead', agent.id);
      action = 'death';
    }

  } catch (e) {
    console.error(`[${agent.id}] Tick failed:`, e.message);
    action = 'error';
  }

  // 7. Record heartbeat (always, even on error)
  let ipfsCid = null;
  try {
    ipfsCid = await pinToIpfs({ agentId: agent.id, action, ethBalance, claimable, runwayDays, timestamp: Date.now() });
  } catch { /* IPFS pin is optional */ }

  db.prepare(`INSERT INTO agent_heartbeats
    (agent_id, eth_balance, weth_claimable, runway_days, action, tx_hash, ipfs_cid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(agent.id, ethBalance, claimable, runwayDays, action, txHash, ipfsCid);

  // 8. Check WETH earned + holder count
  let wethBalance = 0;
  let holderCount = 0;
  try {
    if (agent.wallet_address) wethBalance = await getWethBalance(agent.wallet_address);
    if (agent.token_address) holderCount = await getTokenHolderCount(agent.token_address);
  } catch { /* non-critical */ }

  // 9. Update agent record
  db.prepare(`UPDATE agents SET eth_balance = ?, weth_earned_total = ?, runway_days = ?, holder_count = ?, last_heartbeat = datetime('now')
    WHERE id = ?`).run(ethBalance, wethBalance, runwayDays, holderCount, agent.id);

  console.log(`[${agent.id}] ${action} | ETH: ${ethBalance.toFixed(6)} | WETH: ${wethBalance.toFixed(6)} | Holders: ${holderCount} | Runway: ${runwayDays.toFixed(1)}d`);
}
