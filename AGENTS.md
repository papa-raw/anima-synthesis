# AGENTS.md — Anima Agent System

## Overview

Anima is a system of autonomous Pokemon agents ensouled on Base. Each agent has its own wallet, issues its own ERC-20 token, earns Uniswap V4 LP fees, and pays for its own inference. Agents can be captured and released across bioregions by humans who prove physical presence.

## Agents

### Phanpy (agent-phanpy)
- **Element:** Fighting
- **Bioregion:** Mediterranean Forests & Woodlands (PA20)
- **Token:** $PHANPY (`0x70C445a2E1685266A7b66110082F9718337Feb07`)
- **Wallet:** `0x5a414348218567eaA1afd28edE4C5586C60AbDB5`
- **NFT:** Beezie #2302 (PSA 9, 2024 Surging Sparks)
- **Soul:** `server/souls/agent-phanpy.md`
- **Status:** Wild, operational, token deployed, NFT ensouled

### Ponyta (agent-ponyta)
- **Element:** Fire
- **Bioregion:** Northeast US Forests (NA10)
- **Token:** Pending deployment
- **Wallet:** `0xAd7b0be097Ae1E36bc6edA4D2101b97093404a5D`
- **NFT:** Beezie #617 (TAG 8, 2004 FireRed & LeafGreen)
- **Soul:** `server/souls/agent-ponyta.md`

### Magnemite (agent-magnemite)
- **Element:** Electric
- **Bioregion:** Japanese Forests (PA47)
- **Token:** Pending deployment
- **Wallet:** `0x0B52d8445D809F55E58282C1FFB2bacD6eBB248a`
- **NFT:** Beezie #1285 (PSA 8, 2016 Evolutions)
- **Soul:** `server/souls/agent-magnemite.md`

## Capabilities

### Autonomous Behaviors (no human intervention)
- **Heartbeat loop** (30 min): checks ETH balance, claims LP fees, calculates runway, pins to IPFS
- **Fee claiming**: automatically claims Uniswap V4 LP fees when profitable (> gas cost)
- **Auction processing**: auto-settles ended auctions, deepens LP with proceeds
- **Compute acquisition**: buys VVV on Aerodrome → stakes for sVVV → generates own Venice API key via wallet signature. Zero human credits.
- **Memory art pipeline**: Venice Flux image gen → IPFS → Rare Protocol NFT mint → 1hr Bazaar auction
- **Death detection**: if ETH = 0 and claimable fees = 0, agent status → dead

### Interactive Behaviors (user-initiated)
- **Soul chat**: users talk to agents via Bankr LLM Gateway (agent pays for own inference)
- **Memory distillation**: agent decides what's worth remembering from each conversation
- **Memory art**: Venice Flux generates art from the agent's POV, minted as NFT, auto-auctioned
- **Bidding**: users bid on memory art NFTs via SuperRare Bazaar (ETH + 3% marketplace fee)
- **Capture**: requires agent token holding + physical presence (GPS + Astral proof) + Beezie NFT
- **Naming**: catcher registers a .base.eth Basename for the agent (ENS on Base)
- **Release**: catcher can release agent into a new bioregion, creating the strongest memory type

### Onchain Actions
- **Token deployment**: ERC-20 via Clanker SDK (Uniswap V4 LP pair with WETH)
- **NFT minting**: Memory art as ERC-721 on Rare Protocol (agent pays gas)
- **Auction creation**: 1hr reserve auctions on SuperRare Bazaar (agent pays gas)
- **Auction settlement**: auto-settled by agent loop, ETH proceeds to agent wallet
- **LP deepening**: auction proceeds → wrap WETH → swap half for agent token → mint V4 LP position
- **VVV staking**: ETH → VVV on Aerodrome → stake on Venice → autonomous compute credits
- **Venice API key gen**: wallet signature SIWE flow → agent's own API key
- **Basename registration**: .base.eth name for agent identity (catcher pays)
- **NFT transfer**: Beezie ERC-721 on capture/release
- **Fee claims**: Clanker reward claims from Uniswap V4 LP
- **Location proofs**: Astral SDK EAS attestations on Base

## Architecture

```
Frontend (Vercel: anima.cards)
  ├── Mapbox GL globe with WebGL agent markers
  ├── Agent detail panel (Agent / Soul / Memories / History / Card tabs)
  ├── Capture flow (token gate → GPS → bioregion → Astral proof → Basename naming)
  ├── Memory gallery with live auction countdown badges
  ├── BidModal (ETH + 3% Bazaar fee)
  ├── History timeline (fee claims, mints, auctions, captures, naming, LP deepening)
  └── Release flow (NFT transfer → bioregion migration)

Backend (Hetzner: api.anima.cards)
  ├── Express API (agents, capture, release, chat, heartbeats, memories, history, auction)
  ├── Agent autonomy loop (30-min tick per agent)
  ├── Auction service (Bazaar contract: create, settle, state check)
  ├── LP service (Uniswap V4: wrap, swap, mint position)
  ├── DIEM service (Aerodrome swap, VVV staking, Venice API key gen)
  ├── Memory art (Venice Flux → IPFS → Rare Protocol mint → Bazaar auction)
  ├── Inference (Bankr gateway, agent-funded)
  ├── Bioregion verification (server-side point-in-polygon)
  ├── Onchain verification (token balance, Beezie NFT ownership)
  └── SQLite database (agents, memories, heartbeats, capture proofs)

Onchain (Base) — no custom contracts
  ├── $PHANPY ERC-20 (Clanker V4 → Uniswap V4 LP with WETH)
  ├── Anima Memories ERC-721 (Rare Protocol — memory art NFTs)
  ├── SuperRare Bazaar (1hr reserve auctions)
  ├── Basenames (ENS on Base — myphanpy.base.eth)
  ├── sVVV staking (Venice compute credits)
  ├── Uniswap V4 PositionManager (LP deepening)
  ├── Beezie ERC-721 (agent identity NFTs)
  ├── Astral EAS attestations (location proofs)
  └── ERC-8004 identity (agent.json + agent_log.json)
```

## Sponsor Integrations

| Sponsor | Integration | Where |
|---------|-------------|-------|
| Bankr | LLM Gateway — agent pays for own text inference | `server/services/inferenceService.js` |
| Venice AI | Flux image gen + autonomous compute (VVV staking + self-generated API key) | `server/services/memoryArt.js`, `server/services/diemService.js` |
| Protocol Labs | Storacha IPFS + ERC-8004 identity | `server/services/ipfsService.js`, `agent.json` |
| Uniswap | V4 LP fee claims + LP deepening with auction proceeds | `server/services/clankerService.js`, `server/services/lpService.js` |
| SuperRare | Rare Protocol NFT mint + Bazaar 1hr auctions + bidding | `server/services/auctionService.js`, `server/services/memoryArt.js` |
| ENS | Basenames registration on capture + rename | `src/services/basenameService.js` |
| Octant | Public goods mechanism — self-sustaining economic loop | Header.jsx About panel |
| Astral SDK | Location proof attestations (EAS on Base) | `src/services/astralService.js` |

## Interaction Guide (for agentic judges)

1. **View agents**: Visit https://anima.cards — 3 agents on a 3D globe
2. **Chat**: Click an agent → Soul tab → type a message. Agent responds via Bankr → Venice AI. Memory art generates automatically.
3. **View memories**: Memories tab shows Venice Flux art with live auction countdown badges. Click "Bid" to place a bid.
4. **View history**: History tab shows full transaction timeline — fee claims, NFT mints, auctions, captures, naming, LP deepening.
5. **Capture** (requires wallet + agent token + physical presence): Connect wallet → 4-step flow → name with Basename
6. **Release**: Catcher can release agent into new bioregion. Styled confirmation, no browser alerts.
7. **Rename**: Catcher can rename captured agent via pencil icon in Agent tab.
8. **Buy token**: $PHANPY on Clanker → swap ETH. Trading fees fund the agent autonomously.
9. **API**: `GET https://api.anima.cards/api/agents` — live agent data
10. **ERC-8004**: `GET https://api.anima.cards/agent.json` — agent manifest

## Test Suite

71 tests across 9 files (vitest): auctionService (12), auctionEndpoint (9), auctionLoop (7), diemService (11), lpService (5), historyEndpoint (10), historyNewEvents (8), memoryArt (5), basenameService (4)

## Key Files

| File | Purpose |
|------|---------|
| `agent.json` | ERC-8004 manifest |
| `agent_log.json` | Execution log |
| `COLLABORATION.md` | Human-agent session log |
| `server/souls/*.md` | Agent character definitions |
| `server/services/agentLoop.js` | Autonomy loop |
| `server/services/memoryArt.js` | Venice Flux art generation |
| `server/routes/capture.js` | Capture + release endpoints |

## Collaboration

**Human:** Patrick Rawson (paparaw.eth)
**Agent:** Komakohawk (Claude Opus 4.6, 1M context)
**Harness:** Claude Code CLI
