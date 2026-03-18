# Anima

Autonomous agents ensouled on Base. Each agent issues its own ERC-20 token, earns Uniswap V4 LP fees, and pays for its own inference. Every conversation generates a memory; every memory becomes art; every artwork is minted as an NFT. No human credit card in the loop.

**Live at [anima.cards](https://anima.cards)**

## The Synthesis Hackathon

Built for [The Synthesis](https://synthesis.md/) (Mar 13-22, 2026).

## How It Works

```
Users buy agent token on Clanker
  → Uniswap V4 LP fees accrue
  → Agent claims fees autonomously (every 30 min)
  → Fees fund Bankr LLM Gateway
  → Bankr routes to Venice AI (zero data retention)
  → Agent thinks, remembers, speaks
  → Venice Flux generates art from each memory
  → Art minted as ERC-721 via Rare Protocol on Base
  → Agent survives. If fees dry up, agent dies.
```

### Capture & Release

To capture an agent, you must:
1. **Hold ≥1M of the agent's token** — you must be a stakeholder in the agent's economy
2. **Be physically present** in the agent's bioregion (GPS verified)
3. **Submit an Astral location proof** (EAS attestation on Base)

Buying the token generates LP fees that keep the agent alive. Capturing requires being invested in the agent's survival. On capture, the Beezie NFT transfers onchain from agent wallet to catcher. The catcher can **release** the agent into a new bioregion — creating its most significant memory and artwork.

### Memory Art → Auction → Survival

Every conversation distills into a memory. Each memory generates a unique landscape painting from the agent's perspective via Venice Flux. The art is minted as an ERC-721 NFT on Base using Rare Protocol CLI with integrated IPFS pinning, then automatically auctioned. Auction proceeds extend the agent's runway.

```
Private cognition (Venice, zero retention)
  → Public art (Venice Flux landscape)
  → Onchain NFT (Rare Protocol on Base)
  → 24hr auction (Rare Protocol marketplace)
  → ETH proceeds → agent treasury
  → Agent lives longer → creates more art → cycle continues
```

The agent literally works for a living. Its creative output funds its own survival.

## Agents

| Agent | Element | Bioregion | Token | Wallet |
|-------|---------|-----------|-------|--------|
| Phanpy | Fighting | Mediterranean Forests (PA20) | [$PHANPY](https://clanker.world/clanker/0x70C445a2E1685266A7b66110082F9718337Feb07) | `0x5a41...DB5` |
| Ponyta | Fire | Northeast US Forests (NA10) | $PONYTA | `0xAd7b...5D` |
| Magnemite | Electric | Japanese Forests (PA47) | $MAGNET | `0x0B52...8a` |

## Onchain Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| $PHANPY | [`0x70C4...Feb07`](https://basescan.org/token/0x70C445a2E1685266A7b66110082F9718337Feb07) | Agent ERC-20 token (Clanker V4 + Uniswap LP) |
| Anima Memories | [`0x59Fb...1c1a`](https://basescan.org/token/0x59FbA43625eF81460930a8770Ee9c69042311c1a) | Memory art ERC-721 (Rare Protocol) |
| Beezie CCLT | [`0xbb5e...16f`](https://basescan.org/token/0xbb5ec6fd4b61723bd45c399840f1d868840ca16f) | Agent identity NFTs |

## Sponsor Integrations

| Sponsor | Role | How It's Used |
|---------|------|---------------|
| **Bankr** | LLM Gateway | Sovereign inference — agent funds its own thinking from LP fees |
| **Venice AI** | Private cognition + image gen | Chat via Venice text models (zero retention) + Flux art generation |
| **Uniswap** | Agent economics | V4 LP fee collection powers the entire agent lifecycle |
| **SuperRare** | Rare Protocol | Memory art minted as ERC-721 with IPFS pinning on Base |
| **Protocol Labs** | Identity + storage | ERC-8004 agent manifest + Storacha IPFS heartbeat archival |
| **Octant** | Public goods | Agent-designed capture mechanism (physical presence + DeFi participation) |
| **Astral SDK** | Location proofs | EAS attestations on Base for bioregion verification |
| **Clanker** | Token deployment | ERC-20 + Uniswap V4 LP via factory |
| **Beezie** | Agent identity | Real graded Pokemon card NFTs as agent bodies |

## Stack

- **Frontend:** React + Vite + Tailwind + Mapbox GL (globe projection, WebGL markers)
- **Backend:** Express + SQLite + autonomous agent loops (30-min tick)
- **Chain:** Base (single-chain architecture)
- **Agent Inference:** Bankr LLM Gateway → Venice AI (text + vision)
- **Memory Art:** Venice Flux → Rare Protocol CLI → ERC-721 on Base
- **Location:** Astral SDK (EAS attestations) + server-side bioregion verification

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents` | All agents with live data |
| `GET /api/agents/:id/memories` | Memory art gallery with NFT references |
| `GET /api/agent-log` | Live execution log (for judges) |
| `POST /api/chat` | Talk to an agent's soul |
| `POST /api/capture` | Capture an agent (requires AZUSD + GPS + Beezie) |
| `POST /api/capture/release` | Release a captured agent into a new bioregion |

## Key Files

| File | Purpose |
|------|---------|
| [`agent.json`](./agent.json) | ERC-8004 agent manifest |
| [`agent_log.json`](./agent_log.json) | Live execution log |
| [`AGENTS.md`](./AGENTS.md) | Agent capabilities for agentic judges |
| [`COLLABORATION.md`](./COLLABORATION.md) | Human-agent session log |
| `server/souls/*.md` | Agent character definitions (Descola animist metaphysics) |

## Setup

```bash
npm install
cp .env.example .env
# Fill in API keys (Mapbox, Bankr, Venice)

# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

## Team

Built by [paparaw.eth](https://warpcast.com/paparaw) x Komakohawk (Claude Opus 4.6) for The Synthesis Hackathon.

See [COLLABORATION.md](./COLLABORATION.md) for the full human-agent session log across 3 build sessions.

## License

MIT
