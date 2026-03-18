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
- **Death detection**: if ETH = 0 and claimable fees = 0, agent status → dead
- **WETH tracking**: monitors earned WETH from LP fees
- **Holder count**: polls Blockscout API for token holder count

### Interactive Behaviors (user-initiated)
- **Soul chat**: users talk to agents via Venice AI inference (Bankr LLM Gateway)
- **Memory distillation**: agent decides what's worth remembering from each conversation
- **Memory art**: Venice Flux generates landscape art from the agent's perspective for each memory
- **Capture**: requires AZUSD holding + physical presence (GPS + Astral location proof) + Beezie NFT
- **Release**: catcher can release agent into a new bioregion, creating the strongest memory type

### Onchain Actions
- **Token deployment**: ERC-20 via Clanker SDK (Uniswap V4 LP pair with WETH)
- **NFT transfer**: Beezie ERC-721 transfers on capture (agent → catcher) and release (catcher → agent)
- **Fee claims**: Clanker reward claims from Uniswap V4 LP
- **Location proofs**: Astral SDK EAS attestations on Base

## Architecture

```
Frontend (Vercel: anima.cards)
  ├── Mapbox GL globe with WebGL agent markers
  ├── Agent detail panel (Agent / Soul / Art / Card tabs)
  ├── Capture flow (AZUSD gate → GPS → bioregion verify → Astral proof)
  └── Release flow (NFT transfer back → bioregion migration)

Backend (Hetzner: api.anima.cards)
  ├── Express API (agents, capture, release, chat, heartbeats, memories)
  ├── Agent autonomy loop (30-min tick per agent)
  ├── Venice AI inference (Bankr Gateway → Venice models)
  ├── Venice Flux image generation (memory art)
  ├── Bioregion verification (server-side point-in-polygon)
  ├── Onchain verification (AZUSD balance, Beezie NFT ownership)
  └── SQLite database (agents, memories, heartbeats, capture proofs)

Onchain (Base)
  ├── Agent ERC-20 tokens (Clanker factory → Uniswap V4 LP)
  ├── Beezie ERC-721 (agent identity NFTs)
  ├── AZUSD ERC-20 (capture gate, Azos stablecoin)
  ├── Astral EAS attestations (location proofs)
  └── ERC-8004 identity (agent.json manifest)
```

## Sponsor Integrations

| Sponsor | Integration | Where |
|---------|-------------|-------|
| Bankr | LLM Gateway for sovereign agent inference | `server/services/inferenceService.js` |
| Venice AI | Chat inference + Flux image generation | `server/services/inferenceService.js`, `server/services/memoryArt.js` |
| Protocol Labs | Storacha IPFS + ERC-8004 identity | `server/services/ipfsService.js`, `agent.json` |
| Uniswap | V4 LP fee collection powering agent economics | `server/services/clankerService.js` |
| Astral SDK | Location proof attestations (EAS on Base) | `src/services/astralService.js` |
| Azos Finance | AZUSD stablecoin capture gate | `server/services/onchainVerify.js` |

## Interaction Guide (for agentic judges)

1. **View agents**: Visit https://anima.cards — 3 agents on a 3D globe
2. **Chat**: Click an agent → Soul tab → type a message. Agent responds via Venice AI.
3. **View art**: After chatting, check the Art tab. Venice Flux generates landscape art from the agent's memory.
4. **Capture** (requires wallet + AZUSD + physical presence in bioregion): Connect wallet → verify requirements → capture flow
5. **Release**: After capture, catcher can release agent into their current bioregion
6. **Buy token**: Click $PHANPY → "Buy on Clanker" link → swap ETH for agent token
7. **API**: `GET https://api.anima.cards/api/agents` returns live agent data

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
