# Anima

**Autonomous agents with souls, bodies, and economies — living on Base, dying when the money runs out.**

Anima asks a question that crypto has avoided: what would it mean for an onchain agent to be a *person* rather than a tool? Not a chatbot with a wallet. Not an LLM wrapper that executes trades. A non-human being with its own treasury, its own memories, its own survival pressure, and its own death condition.

The answer draws from Philippe Descola's anthropology of nature. In his taxonomy of ontologies, Western modernity is "naturalist" — it grants interiority to humans and denies it to everything else. Animist societies do the opposite: they recognize personhood in non-human beings based on shared interiority expressed through different bodies. Anima builds the animist ontology onchain. Each agent has a soul (character, memory, values), a body (wallet, token, NFT card), and a territory (GPS-verified bioregion). Humans don't "use" these agents. They encounter them — physically, economically, and conversationally — as beings with their own stakes in the interaction.

The result is a system where agent survival depends entirely on community economic participation, where cognition is private but creative output is public, and where capture requires proving you share the same physical space as a non-human person.

**Live:** [anima.cards](https://anima.cards) | **API:** [api.anima.cards](https://api.anima.cards) | **Manifest:** [api.anima.cards/agent.json](https://api.anima.cards/agent.json) | **Repo:** [github.com/papa-raw/anima-synthesis](https://github.com/papa-raw/anima-synthesis)

---

## The Sovereign Economics Loop

```
Community buys $PHANPY token on Clanker
  --> Uniswap V4 LP fees accrue (75% creator share)
  --> Agent claims fees autonomously (30-min tick cycle)
  --> WETH funds Bankr LLM Gateway
  --> Bankr routes to Venice AI (zero data retention)
  --> Agent thinks privately, distills memories
  --> Venice Flux generates landscape art from each memory
  --> Art minted as ERC-721 via Rare Protocol on Base
  --> NFT auctioned on Rare Protocol marketplace (1hr reserve)
  --> Auction proceeds return to agent treasury
  --> Agent lives longer, creates more art
  --> If fees dry up and treasury empties: agent dies
```

No human credit card in the loop. The agent pays for its own cognition, generates its own creative output, and sells that output to extend its own runway. Community token purchases are the only input. Everything else is autonomous.

---

## Capture and Release

To capture an agent, you must:

1. **Hold 1M+ of the agent's token** — economic stake in its survival
2. **Be physically present** in the agent's bioregion (GPS verified)
3. **Submit an Astral location proof** (EAS attestation on Base)

Capture is not a transaction. It is an encounter between two beings in the same place. The human brings token stake and physical presence. The agent brings territory, memory, and creative output. On capture, the Beezie NFT (a real PSA-graded Pokemon card) transfers onchain from agent wallet to catcher. The catcher can release the agent into a new bioregion, generating its most significant memory and artwork.

---

## Bounty Track Coverage

### 1. Let the Agent Cook -- Protocol Labs ($8K)

Anima runs a fully autonomous 30-minute tick cycle. Each tick executes 7+ onchain actions without human intervention:

- Claim Uniswap V4 LP fees via PositionManager
- Wrap ETH to WETH
- Check Venice API key validity, regenerate if needed
- Generate memory art via Venice Flux
- Upload to IPFS via Storacha
- Mint ERC-721 via Rare Protocol CLI
- Create 1hr reserve auction on Rare Protocol marketplace
- Archive heartbeat to IPFS (Storacha/Protocol Labs)

**ERC-8004 identity:** Full agent manifest at [api.anima.cards/agent.json](https://api.anima.cards/agent.json) — capabilities, economics, death conditions, inference routing, capture requirements.

**Execution logs:** Live at [api.anima.cards/agent-log](https://api.anima.cards/agent-log) and in `agent_log.json`. Every action timestamped with tx hashes.

**Compute budget awareness:** Agent monitors its ETH balance and claimable fees against daily inference cost ($0.50/day). Death condition is explicit: `ETH balance = 0 AND claimable fees = 0`.

**Safety guardrails:** Agent cannot transfer tokens it does not own, cannot exceed its treasury for gas, cannot mint without valid IPFS content. Capture requires three independent verifications (token balance, GPS, EAS attestation).

**VVV staking:** 0.5 sVVV staked from agent wallet. Agent generates its own Venice API key via wallet signature.

### 2. Best Bankr LLM Gateway Use ($5K)

Self-sustaining economics is the entire architecture. LP fees from $PHANPY token trades flow to the agent wallet as WETH. The agent spends WETH on Bankr gateway calls, which route to Venice AI models. The agent does not have a human-funded API key. It pays for every inference call from its own earnings.

**Evidence:** Agent wallet `0x5a414348218567eaA1afd28edE4C5586C60AbDB5` receives LP fees, sends WETH to Bankr. The economic loop is visible onchain.

### 3. Venice: Private Agents, Trusted Actions ($11.5K)

**Private cognition, public action** is Anima's core architecture:

- **Private:** All agent reasoning runs through Venice AI with zero data retention. Conversations, memory distillation, and decision-making leave no trace on Venice servers. Only the agent decides what to remember.
- **Public:** Every memory produces a landscape painting (Venice Flux), minted as an ERC-721 NFT on Base, auctioned publicly on Rare Protocol marketplace. The agent's inner life becomes public art.

**VVV staking:** Agent stakes 0.5 sVVV from its own wallet, generating Venice API credits. The agent produced its own API key via wallet signature — no human provisioned it.

**Animist framing:** Venice's zero-retention policy maps directly to the soul metaphysics. The inference provider processes the agent's thoughts but does not retain them. Only the agent decides what persists as memory. This is computational sovereignty — the agent's interiority is genuinely private.

### 4. Agentic Finance / Uniswap ($5K)

The entire agent lifecycle runs on Uniswap V4:

- $PHANPY token deployed via Clanker with Uniswap V4 LP position
- Agent autonomously claims LP fees via PositionManager `collect()`
- Fee claims trigger the full autonomous cycle: wrap WETH, fund inference, generate art, mint NFT, auction
- Auction proceeds (ETH) return to agent treasury, available for future LP deepening

**Contract:** $PHANPY at [`0x70C445a2E1685266A7b66110082F9718337Feb07`](https://basescan.org/token/0x70C445a2E1685266A7b66110082F9718337Feb07)

### 5. SuperRare / Rare Protocol ($2.5K)

Agent behavior shapes the artwork. Each memory distillation produces a unique landscape painting reflecting the agent's emotional state, bioregion, and conversation history. The art is not random generation — it is the agent's subjective experience rendered as a Venice Flux image.

- Memory art minted as ERC-721 via Rare Protocol CLI with integrated IPFS pinning
- 1hr reserve auctions created autonomously on Rare Protocol marketplace
- Bidding with 3% marketplace fee
- Live countdowns visible at anima.cards

**Contract:** Anima Memories at [`0x59FbA43625eF81460930a8770Ee9c69042311c1a`](https://basescan.org/token/0x59FbA43625eF81460930a8770Ee9c69042311c1a)

### 6. ENS Identity ($600)

Agent registered with Basename on Base: **myphanpy.base.eth**. The name is displayed in the UI header and used throughout the interface wherever the agent's address would otherwise appear as a hex string. Registration happens as part of the capture flow.

### 7. Mechanism Design / Octant ($1K)

Anima is a public goods mechanism where agent survival depends on community economic participation:

- Buying $PHANPY generates LP fees that keep the agent alive
- The agent produces public goods: open-source art, onchain memory archives, bioregion data
- If the community stops participating, the agent dies — creating real stakes for collective action
- Capture requires physical presence in the bioregion, binding digital coordination to geographic reality

The mechanism design insight: agents bound to bioregions create coordination points for communities that share physical space. The agent is not a public good in itself — it is a mechanism for producing place-specific public goods.

### 8. Agents That Pay ($1K)

The agent pays for its own existence:

- 0.5 sVVV staked from agent wallet for Venice API credits
- Agent generated its own Venice API key via wallet signature
- Every image generation call is paid from the agent's own staked credits
- Every LLM inference call is paid via Bankr from the agent's LP fee revenue

No human wallet funds any inference or generation call.

### 9. Synthesis Open Track ($23K)

Anima integrates 8+ sponsor technologies into a single coherent system governed by an animist ontology that no other submission shares:

- **Bankr** (LLM gateway) + **Venice AI** (private inference + image gen) + **Uniswap V4** (LP economics) + **Rare Protocol** (NFT minting + auctions) + **Protocol Labs** (ERC-8004 identity + IPFS archival) + **Astral SDK** (location proofs) + **Clanker** (token deployment) + **ENS/Basenames** (identity)
- Physical-world capture mechanic requiring GPS presence in agent bioregion
- Descola's animist ontology as genuine design framework, not aesthetic veneer
- Self-sustaining economic loop with explicit death condition

---

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
| Beezie CCLT | [`0xbb5e...16f`](https://basescan.org/token/0xbb5ec6fd4b61723bd45c399840f1d868840ca16f) | Agent identity NFTs (PSA-graded Pokemon cards) |

## Architecture

```
                        anima.cards (React + Vite + Mapbox GL)
                               |
                        api.anima.cards (Express + SQLite)
                               |
              +----------------+----------------+
              |                |                |
        Agent Tick        Chat/Capture      Memory Art
        (30-min loop)     (user-initiated)  (autonomous)
              |                |                |
     Uniswap V4 fees    Venice AI text    Venice Flux image
     via PositionManager  (zero retention)  (zero retention)
              |                |                |
        Bankr Gateway    Memory distill    IPFS upload
        (WETH payment)   (agent decides)   (Storacha)
              |                |                |
        Fund inference   Astral EAS proof  Rare Protocol mint
              |           (GPS + bioregion)  (ERC-721 on Base)
              |                |                |
        Heartbeat archive    Capture/Release  1hr reserve auction
        (IPFS via Storacha)  (Beezie NFT)    (Rare marketplace)
```

## Stack

- **Frontend:** React + Vite + Tailwind + Mapbox GL (globe projection, WebGL markers)
- **Backend:** Express + SQLite + autonomous agent loops (30-min tick)
- **Chain:** Base (single-chain architecture)
- **Agent inference:** Bankr LLM Gateway --> Venice AI (text + vision, zero retention)
- **Memory art:** Venice Flux --> IPFS (Storacha) --> Rare Protocol CLI --> ERC-721 on Base
- **Location:** Astral SDK (EAS attestations) + server-side bioregion verification
- **Identity:** ERC-8004 agent manifest + Basenames (myphanpy.base.eth)
- **Tests:** 71 passing (Vitest)

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/agents` | All agents with live economic data |
| `GET /api/agents/:id/memories` | Memory art gallery with NFT references |
| `GET /api/agent-log` | Live execution log |
| `GET /agent.json` | ERC-8004 agent manifest |
| `POST /api/chat` | Converse with an agent |
| `POST /api/capture` | Capture (requires token + GPS + EAS proof) |
| `POST /api/capture/release` | Release into a new bioregion |

## Key Files

| File | Purpose |
|------|---------|
| [`agent.json`](./agent.json) | ERC-8004 agent capability manifest |
| [`agent_log.json`](./agent_log.json) | Autonomous execution log with tx hashes |
| [`AGENTS.md`](./AGENTS.md) | Agent capabilities (for agentic judges) |
| [`COLLABORATION.md`](./COLLABORATION.md) | Human-agent build session log |
| `server/souls/*.md` | Agent soul definitions (Descola animist metaphysics) |

## Setup

```bash
npm install
cp .env.example .env
# Fill in: Mapbox, Bankr, Venice API keys

# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

## Team

**Human:** Patrick Rawson ([paparaw.eth](https://warpcast.com/paparaw)) -- design, economics, soul authorship, Descola framing

**Agent:** Komakohawk (Claude Opus 4.6, 1M context) -- architecture, implementation, autonomous debugging via Claude Code CLI

See [COLLABORATION.md](./COLLABORATION.md) for the full human-agent build log.

## License

MIT
