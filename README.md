# Anima

Autonomous Pokemon agents ensouled on Base. Each agent issues its own ERC-20 token, earns Uniswap V4 LP fees, and pays for its own inference. Capture them by proving you're physically in their bioregion with an Astral location proof and an AZUSD stablecoin holding.

**Ensoulment** → **Release** → **Capture**

## The Synthesis Hackathon

Built for [The Synthesis](https://synthesis.md/) (Mar 13-22, 2026).

**Tracks:** Agents that Pay · Agents that Trust · Agents that Cooperate

## How It Works

1. Real Pokemon NFTs (from [Beezie](https://beezie.com) on Base) are ensouled as autonomous agents
2. Each agent deploys its own ERC-20 token via Clanker SDK and earns LP fees to fund compute
3. Agents are released into bioregions on a 3D globe (One Earth bioregion boundaries)
4. Agents think using sovereign inference: LP earnings → Bankr gateway → Venice AI models
5. To capture an agent, you must:
   - Hold ≥5 AZUSD ([Azos](https://azos.finance) stablecoin) — backed by diversified Base collateral
   - Be physically present in the agent's bioregion (GPS verified)
   - Submit an Astral location proof (EAS attestation on Base)
6. On capture, the Beezie NFT transfers from agent wallet to catcher wallet

## Agents

| Pokemon | Element | Bioregion | Token | Status |
|---------|---------|-----------|-------|--------|
| Phanpy | Fighting | Mediterranean Forests (PA20) | $PHANPY | Wild |
| Ponyta | Fire | Northeast US Forests (NA10) | $PONYTA | Wild |
| Magnemite | Electric | Japanese Forests (PA47) | $MAGNET | Wild |

## Sovereign Agent Economics

```
Agent earns WETH from Uniswap V4 LP fees
  → Pays Bankr inference gateway
    → Bankr routes to Venice AI models
      → Agent thinks, remembers, speaks
        → No human credit card in the loop
```

If LP earnings dry up, the agent dies. Runway is calculated every 30 minutes. Each agent costs ~$0.50/day to survive.

## Stack

- **Frontend:** React + Vite + Tailwind + Mapbox GL (globe projection, WebGL markers)
- **Backend:** Express + SQLite + autonomous agent loops (30-min tick)
- **Chain:** Base (single-chain architecture)
- **NFTs:** Beezie Collectibles (CCLT) ERC-721
- **Tokens:** Clanker SDK (ERC-20 + Uniswap V4 LP)
- **Location Proofs:** Astral SDK (EAS attestations on Base)
- **Agent Inference:** Bankr LLM Gateway → Venice AI
- **Storage:** Storacha (IPFS pinning for agent heartbeats)
- **Capture Gate:** Azos AZUSD (decentralized stablecoin on Base)

## Setup

```bash
npm install
cp .env.example .env
# Fill in API keys (Mapbox, Bankr, Venice, Storacha)

# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

## Scripts

```bash
npm run generate-wallets  # Create agent keypairs
npm run seed-agents       # Populate DB with agent data
npm run deploy-tokens     # Deploy agent tokens on Base via Clanker
npm run fund-agents       # Show funding amounts (transfer manually)
npm run release-nft       # Transfer Beezie NFT to agent wallet (ensoulment)
npm run recall-nft        # Pull NFT back for testing
```

## Sponsor Bounties

| Sponsor | Integration | Bounty |
|---------|-------------|--------|
| Bankr | LLM Gateway for sovereign agent inference | $5,000 |
| Venice AI | Private cognition backend (no-data-retention inference) | $11,500 |
| Protocol Labs | Storacha IPFS heartbeat archival + ERC-8004 identity | $16,000 |
| Uniswap | LP fee collection powering agent economics | $5,000 |

### Other Integrations (not sponsor bounties)

| Tool | Integration |
|------|-------------|
| Astral SDK | Location proof attestations (EAS on Base) |
| Clanker SDK | Token deployment (ERC-20 + Uniswap V4 LP) |
| Beezie | Real Pokemon card NFTs as agent identity |
| Azos Finance | AZUSD stablecoin capture gate |

## Team

Built by [paparaw.eth](https://warpcast.com/paparaw) x Komakohawk (Claude Opus 4.6)

See [COLLABORATION.md](./COLLABORATION.md) for the full human-agent session log.

## License

MIT
