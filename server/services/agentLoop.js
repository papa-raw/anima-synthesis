import { getEthBalance, getClaimableFees, claimFees, getEthPrice, getWethBalance, getTokenHolderCount } from './clankerService.js';
import { logAgentEvent } from './agentLogger.js';
import { pinToIpfs } from './ipfsService.js';
import { getAuctionState, settleAuction } from './auctionService.js';
import { deepenLiquidity } from './lpService.js';
import { shouldBuyDiem, buyDiem } from './diemService.js';

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

  // 7. Auto-settle auctions + LP deepen
  try {
    await processAuctions(agent, db);
  } catch (e) {
    console.error(`[${agent.id}] Auction processing failed:`, e.message);
  }

  // 8. Buy DIEM for autonomous Venice inference if agent can afford it
  try {
    if (agent.wallet_address && await shouldBuyDiem(agent.id, ethBalance, agent.wallet_address)) {
      // Spend 30% of balance on DIEM, keep rest for gas + runway
      const diemSpend = ethBalance * 0.3;
      const result = await buyDiem(agent.id, diemSpend);
      if (result?.txHash) {
        db.prepare(
          'INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, ?, ?, ?)'
        ).run(agent.id, 'diem_purchase', result.txHash, diemSpend);
        logAgentEvent(agent.id, 'diem_purchase', { ethSpent: diemSpend, diemReceived: result.diemReceived, txHash: result.txHash });
        // Re-check balance after purchase
        ethBalance = await getEthBalance(agent.wallet_address);
      }
    }
  } catch (e) {
    console.error(`[${agent.id}] DIEM purchase failed:`, e.message);
  }

  // 9. Record heartbeat (always, even on error)
  let ipfsCid = null;
  try {
    ipfsCid = await pinToIpfs({ agentId: agent.id, action, ethBalance, claimable, runwayDays, timestamp: Date.now() });
  } catch { /* IPFS pin is optional */ }

  db.prepare(`INSERT INTO agent_heartbeats
    (agent_id, eth_balance, weth_claimable, runway_days, action, tx_hash, ipfs_cid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(agent.id, ethBalance, claimable, runwayDays, action, txHash, ipfsCid);

  // 9. Check WETH earned + holder count
  let wethBalance = 0;
  let holderCount = 0;
  try {
    if (agent.wallet_address) wethBalance = await getWethBalance(agent.wallet_address);
    if (agent.token_address) holderCount = await getTokenHolderCount(agent.token_address);
  } catch { /* non-critical */ }

  // 10. Update agent record
  db.prepare(`UPDATE agents SET eth_balance = ?, weth_earned_total = ?, runway_days = ?, holder_count = ?, last_heartbeat = datetime('now')
    WHERE id = ?`).run(ethBalance, wethBalance, runwayDays, holderCount, agent.id);

  console.log(`[${agent.id}] ${action} | ETH: ${ethBalance.toFixed(6)} | WETH: ${wethBalance.toFixed(6)} | Holders: ${holderCount} | Runway: ${runwayDays.toFixed(1)}d`);

  logAgentEvent(agent.id, action, { ethBalance, wethBalance, claimable, runwayDays, holderCount, txHash });
}

/**
 * Process pending auctions: check state, settle if ended, deepen LP with proceeds
 */
async function processAuctions(agent, db) {
  const memories = db.prepare(
    `SELECT id, nft_token_id, nft_contract, auction_status
     FROM agent_memories
     WHERE agent_id = ? AND nft_token_id IS NOT NULL AND auction_status IS NOT NULL AND auction_status NOT IN ('settled', 'expired')
     ORDER BY created_at DESC LIMIT 20`
  ).all(agent.id);

  if (memories.length === 0) return;

  for (const mem of memories) {
    try {
      const state = await getAuctionState(mem.nft_contract, mem.nft_token_id);

      if (state.status === 'ended' && state.currentBidder) {
        // Auction ended with a bid — settle it
        const balanceBefore = await getEthBalance(agent.wallet_address);
        const settleTx = await settleAuction(agent.id, mem.nft_contract, mem.nft_token_id);
        const balanceAfter = await getEthBalance(agent.wallet_address);
        const proceeds = balanceAfter - balanceBefore;

        db.prepare(
          'UPDATE agent_memories SET auction_status = ?, auction_settle_tx = ?, auction_settled_at = datetime(\'now\') WHERE id = ?'
        ).run('settled', settleTx, mem.id);

        console.log(`[${agent.id}] Auction settled: NFT #${mem.nft_token_id} → ${proceeds.toFixed(6)} ETH`);

        // Log settlement in heartbeats (appears in History tab) + agent_log
        db.prepare(
          'INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, ?, ?, ?)'
        ).run(agent.id, 'auction_settle', settleTx, proceeds);

        logAgentEvent(agent.id, 'auction_settle', {
          nftTokenId: mem.nft_token_id,
          proceeds,
          settleTx,
          buyer: state.currentBidder
        });

        // LP deepen with proceeds
        if (proceeds > 0.0002 && agent.token_address) {
          try {
            const lpResult = await deepenLiquidity(agent.id, proceeds, agent.token_address);
            if (lpResult?.mintTx) {
              // Log LP deepen in heartbeats (appears in History tab)
              db.prepare(
                'INSERT INTO agent_heartbeats (agent_id, action, tx_hash, eth_balance) VALUES (?, ?, ?, ?)'
              ).run(agent.id, 'lp_deepen', lpResult.mintTx, proceeds);

              logAgentEvent(agent.id, 'lp_deepen', {
                ethAmount: proceeds,
                mintTx: lpResult.mintTx,
                tokenAddress: agent.token_address
              });
              console.log(`[${agent.id}] LP deepened with ${proceeds.toFixed(6)} ETH`);
            }
          } catch (e) {
            console.error(`[${agent.id}] LP deepen failed:`, e.message);
          }
        }
      } else if (state.status === 'expired') {
        // Ended with no bids
        db.prepare('UPDATE agent_memories SET auction_status = ? WHERE id = ?').run('expired', mem.id);
        console.log(`[${agent.id}] Auction expired: NFT #${mem.nft_token_id}`);
      } else if (state.status === 'live' && mem.auction_status !== 'live') {
        // First bid received — clock started
        db.prepare('UPDATE agent_memories SET auction_status = ? WHERE id = ?').run('live', mem.id);
        console.log(`[${agent.id}] Auction live: NFT #${mem.nft_token_id} (${state.currentBid} ETH)`);
      }
    } catch (e) {
      console.error(`[${agent.id}] Auction check failed for #${mem.nft_token_id}:`, e.message);
    }
  }
}
