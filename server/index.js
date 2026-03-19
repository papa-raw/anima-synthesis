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
const BAZAAR = '0x4F3832471190049CEf76a6FFDf56FDbD88672949';
const BAZAAR_ABI = [
  {
    inputs: [{ name: '_originContract', type: 'address' }, { name: '_tokenId', type: 'uint256' }],
    name: 'getAuctionDetails',
    outputs: [
      { name: 'auctionCreator', type: 'address' },
      { name: 'creationBlock', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'lengthOfAuction', type: 'uint256' },
      { name: 'currencyAddress', type: 'address' },
      { name: 'minimumBid', type: 'uint256' },
      { name: 'auctionType', type: 'bytes32' },
      { name: 'splitAddresses', type: 'address[]' },
      { name: 'splitRatios', type: 'uint8[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_originContract', type: 'address' }, { name: '_tokenId', type: 'uint256' }],
    name: 'auctionBids',
    outputs: [
      { name: 'bidder', type: 'address' },
      { name: 'currencyAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'marketplaceFee', type: 'uint8' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

app.get('/api/auction/:contract/:tokenId', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const { contract, tokenId } = req.params;
    const details = await auctionClient.readContract({
      address: BAZAAR, abi: BAZAAR_ABI, functionName: 'getAuctionDetails',
      args: [contract, BigInt(tokenId)]
    });
    const [creator, , startTime, length, currency, minBid, auctionType] = details;
    if (creator === '0x0000000000000000000000000000000000000000') {
      return res.json({ active: false });
    }

    // Try to get current bid
    let currentBid = '0', currentBidder = null;
    try {
      const bidDetails = await auctionClient.readContract({
        address: BAZAAR, abi: BAZAAR_ABI, functionName: 'auctionBids',
        args: [contract, BigInt(tokenId)]
      });
      if (bidDetails[0] !== '0x0000000000000000000000000000000000000000') {
        currentBidder = bidDetails[0];  // address bidder
        currentBid = formatEther(bidDetails[2]); // uint256 amount
      }
    } catch { /* no bid yet */ }

    const startNum = Number(startTime);
    const lengthNum = Number(length);
    const now = Math.floor(Date.now() / 1000);
    const isReserve = startNum === 0; // reserve auction hasn't had first bid yet
    const endsAt = startNum > 0 ? startNum + lengthNum : null;
    const expired = endsAt ? now > endsAt : false;

    res.json({
      active: !expired,
      creator,
      currency,
      minBid: formatEther(minBid),
      currentBid,
      currentBidder,
      isReserve,
      endsAt,
      lengthSeconds: lengthNum,
      bazaar: BAZAAR
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
