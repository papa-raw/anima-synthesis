import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import agentsRouter from './routes/agents.js';
import captureRouter from './routes/capture.js';
import heartbeatsRouter from './routes/heartbeats.js';
import chatRouter from './routes/chat.js';
import { startAgentLoops } from './services/agentLoop.js';
import { loadBioregions } from './services/bioregionVerify.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize database
const db = initDb();

// Load bioregion boundaries for server-side capture verification
loadBioregions();

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/capture', captureRouter);
app.use('/api/heartbeats', heartbeatsRouter);
app.use('/api/chat', chatRouter);

// Serve agent execution log (Protocol Labs bounty — judges inspect this)
app.get('/api/agent-log', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const logPath = join(__dirname, '../agent_log.json');
    const { readFileSync } = require('fs');
    res.json(JSON.parse(readFileSync(logPath, 'utf8')));
  } catch {
    res.json({ events: [] });
  }
});

// Rare Protocol auction status (SuperRare Bazaar on Base)
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

const auctionClient = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org') });
const AUCTION_CONTRACT = '0xbe2DFd20300Be5CFa009e13C4AE8e3ed0bC16Ff1';
const AUCTION_ABI = [{
  inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }],
  name: 'auctions',
  outputs: [
    { name: 'seller', type: 'address' },
    { name: 'minBid', type: 'uint256' },
    { name: 'duration', type: 'uint256' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'highBidder', type: 'address' },
    { name: 'highBid', type: 'uint256' },
    { name: 'settled', type: 'bool' }
  ],
  stateMutability: 'view',
  type: 'function'
}];

app.get('/api/auction/:contract/:tokenId', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { contract, tokenId } = req.params;
    const result = await auctionClient.readContract({
      address: AUCTION_CONTRACT, abi: AUCTION_ABI, functionName: 'auctions',
      args: [contract, BigInt(tokenId)]
    });
    const [seller, minBid, duration, startTime, endTime, highBidder, highBid, settled] = result;
    if (seller === '0x0000000000000000000000000000000000000000') {
      return res.json({ active: false });
    }

    const now = Math.floor(Date.now() / 1000);
    const startNum = Number(startTime);
    const endNum = Number(endTime);
    const isReserve = startNum === 0;
    const expired = endNum > 0 ? now > endNum : false;

    res.json({
      active: !expired && !settled,
      creator: seller,
      minBid: formatEther(minBid),
      currentBid: formatEther(highBid),
      currentBidder: highBidder !== '0x0000000000000000000000000000000000000000' ? highBidder : null,
      isReserve,
      endsAt: endNum || null,
      lengthSeconds: Number(duration),
      auction: AUCTION_CONTRACT
    });
  } catch (e) {
    res.json({ active: false, error: e.message });
  }
});

// ERC-8004 compliance — serve agent manifest + execution log
app.get('/agent.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(join(__dirname, '../agent.json'));
});
app.get('/.well-known/agent.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(join(__dirname, '../agent.json'));
});

// Serve generated art
app.use('/art', express.static(join(__dirname, '../public/art')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Anima server running on :${PORT}`);
  // Start agent autonomy loops after server is ready
  startAgentLoops(db);
});
