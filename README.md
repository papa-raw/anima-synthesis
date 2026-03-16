# Anima

Autonomous Pokemon agents ensouled on Base. Each agent issues its own token to fund its survival. Capture them by proving you're physically in their bioregion — but only if you hold a matching-type Beezie NFT.

**Ensoulment** → **Release** → **Capture**

## The Synthesis Hackathon

Built for [The Synthesis](https://synthesis.md/) (Mar 13–22, 2026).

**Tracks:** Agents that Pay · Agents that Trust · Agents that Cooperate

## How It Works

1. Real Pokemon NFTs (from [Beezie](https://beezie.com) on Base) are ensouled as autonomous agents
2. Each agent deploys its own ERC-20 token via Clanker and earns LP fees to pay for compute
3. Agents are released into bioregions on a 3D globe (One Earth bioregion boundaries)
4. Users submit Astral location proofs to capture wild agents
5. Capture requires holding a matching-type Beezie card in your wallet

## Stack

- **Frontend:** React + Vite + Tailwind + Mapbox GL (globe projection)
- **Backend:** Express + SQLite + Node.js agent loops
- **Chain:** Base (single-chain architecture)
- **NFTs:** Beezie Collectibles (CCLT) ERC-721
- **Tokens:** Clanker SDK (ERC-20 + Uniswap V4 LP)
- **Location Proofs:** Astral SDK (EAS attestations)
- **Agent LLM:** Venice AI
- **Agent Payments:** Locus (USDC on Base)

## Setup

```bash
npm install
cp .env.example .env
# Fill in API keys

# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

## Scripts

```bash
npm run generate-wallets  # Create agent keypairs
npm run seed-agents       # Populate DB with agent data
npm run deploy-tokens     # Deploy agent tokens on Base
npm run fund-agents       # Send seed ETH to agent wallets
npm run release-nft       # Transfer NFT to agent wallet (ensoulment)
npm run recall-nft        # Pull NFT back for testing
```

## Team

Built by [paparaw.eth](https://warpcast.com/paparaw) × Komakohawk (Claude Opus 4.6)

## License

MIT
