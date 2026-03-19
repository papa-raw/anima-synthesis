# Anima — Project Status & Technical Record
**Last updated:** 2026-03-19 15:30 UTC (Session 4)

---

## Architecture

### Onchain (no custom contracts)

| Contract | Address | Purpose |
|----------|---------|---------|
| $PHANPY (Clanker ERC-20) | `0x70C445a2E1685266A7b66110082F9718337Feb07` | Agent token, Uniswap V4 LP with WETH |
| Beezie ERC-721 | `0xbb5ec6fd4b61723bd45c399840f1d868840ca16f` | Pokemon card NFTs as agent identity |
| Anima Memories (Rare Protocol ERC-721) | `0x59FbA43625eF81460930a8770Ee9c69042311c1a` | Memory art NFTs minted by agent |
| SuperRare Bazaar (ours) | `0x4F3832471190049CEf76a6FFDf56FDbD88672949` | Auction marketplace — full stack redeployed by agent |
| StakingRegistryStub | `0x344604032bFc0704b42888e0fD4C6447c1728cE7` | Stub for Bazaar settlement (original had stakingRegistry=0x0) |
| WETH (Base) | `0x4200000000000000000000000000000000000006` | LP pair token |
| Basenames RegistrarController | `0xa7d2607c6BD39Ae9521e514026CBB078405Ab322` | ENS naming on Base |
| Uniswap V4 PositionManager | `0x7c5f5a4bbd8fd63184577525326123b519429bdc` | LP position minting |
| VVV (Venice Compute Token) | `0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf` | Autonomous compute acquisition |
| sVVV Staking | `0x321b7ff75154472b18edb199033ff4d116f340ff` | Venice AI credits via staking |
| Aerodrome Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` | ETH → VVV swap |

### Agent Wallets

| Agent | Wallet | Funded | Token | NFT | Status |
|-------|--------|--------|-------|-----|--------|
| Phanpy | `0x5a41...DB5` | 0.001 ETH | $PHANPY deployed | Beezie #2302 ensouled | Wild, operational |
| Ponyta | `0xAd7b...5D` | Not funded | Not deployed | Not ensouled | Pending |
| Magnemite | `0x0B52...8a` | Not funded | Not deployed | Not ensouled | Pending |

### Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Frontend | anima.cards (Vercel) | Live |
| Backend | api.anima.cards (Hetzner Nuremberg, 46.225.135.67) | Live, PM2 `anima-api` |
| DB | SQLite at `/var/www/anima/server/db/anima.db` | Phanpy seeded with live data |
| Repo | github.com/papa-raw/anima-synthesis | Public, 50+ commits |

---

## Session 2 Changes (Mar 17-18)

### Globe & UI
- Replaced DOM markers with WebGL circle + symbol layers (fixes drift in globe projection)
- Markers 50% larger, card art PFPs in footer dock, click-to-fly
- Bioregion permanent highlights + labels for agent territories
- Globe no longer dims on agent selection (only capture mode)
- Ponyta relocated to NYC (NA10) for demo accessibility

### Security Hardening
- Server-side AZUSD balance check (≥5 required, 403 if insufficient)
- Server-side Beezie NFT ownership check (≥1 required, 403 if none)
- Server-side bioregion point-in-polygon verification
- Simulated Astral proofs gated behind DEMO_MODE only (production requires real attestation)
- Hookify rule `readme-hallucination-check` blocks fabricated claims in README

### AZUSD Migration (replaced $TGN)
- Conservation gate changed from Treegens ($TGN, any amount) to Azos AZUSD (≥5)
- Contract: `0x3595ca37596d5895b70efab592ac315d5b9809b2`
- Buy link: Hydrex DEX (`hydrex.fi/swap?tokenIn=ETH&tokenOut=0x3595...`)
- All frontend, backend, souls, docs updated. Zero TGN references remain in active code.

### Agent Souls
- Ponyta soul: fire as transformation, NYC urban ecology, restless voice
- Magnemite soul: electromagnetism as relation, Honshu landscape, quiet/precise voice
- All three use Descola animist metaphysics, first-person sovereign voice

### ERC-8004 Compliance
- `agent.json` manifest with all agents, capabilities, sponsor integrations
- `agent_log.json` execution log with session actions and artifacts
- Required for Protocol Labs bounty ($16K) and submission

### Caching Fix
- `fetch('/api/agents?_=${Date.now()}', { cache: 'no-store' })` on client
- `Cache-Control: no-store` header on server agent route
- `selectedAgent` derived from `agents` list (not separate state) — fixes stale detail panel

### Token Deployment
- $PHANPY deployed via Clanker CLI (`clanker-sdk deploy`)
- Clanker SDK v4 API: `deploy()` not `deployToken()`, `startingMarketCap` not `initialMarketCap`
- Token art: circle-cropped PNGs generated from card images via `scripts/generate-token-art.js`
- Token image served from `anima.cards/tokens/agent-phanpy.png`

### Documentation
- COLLABORATION.md updated with full Session 2 timeline + decisions
- README.md rewritten — correct sponsor bounties vs integrations separation
- Secrets file re-encrypted with AZUSD contract address

---

## Testing Results (Mar 18)

### API Tests
| Test | Result | Notes |
|------|--------|-------|
| `GET /api/health` | 200 OK | `{"status":"ok","agents":1}` |
| `GET /api/agents` | 200 OK | Returns Phanpy with live balance + runway |
| `POST /api/capture` (no AZUSD) | 403 | `"Insufficient AZUSD"` — server-side check works |
| `POST /api/capture` (with AZUSD, Barcelona coords) | 200 | Capture recorded, status → captured |
| `POST /api/capture` (wrong bioregion) | 403 | Bioregion mismatch detected server-side |

### Onchain Tests
| Test | Result | Notes |
|------|--------|-------|
| Phanpy wallet balance | 0.000974 ETH | Funded, gas used for token deploy |
| $PHANPY token deployed | `0x70C445...Feb07` | Clanker V4, Dynamic3 fees, WETH pair |
| Beezie #2302 ownership | Phanpy wallet | Ensoulment confirmed |
| AZUSD balance check (paparaw.eth) | 5.82 AZUSD | Gate passes (≥5 required) |
| $PHANPY swap (Clanker/KyberSwap) | 0.0005 ETH → 475M PHANPY | Working via clanker.world |
| LP fee claim | tx `0x3a3c...5ee7` | First sovereign fee claim — loop works |
| Uniswap V4 direct swap | NO ROUTE | Uniswap frontend hasn't indexed V4 pool yet |

### Frontend Tests
| Test | Result | Notes |
|------|--------|-------|
| Globe renders with 3 markers | Pass | WebGL layers, no drift |
| Click dock → fly to agent | Pass | Smooth fly animation |
| Bioregion highlights | Pass | Green fill + border + label for PA20, NA10, PA47 |
| Agent detail panel shows live data | Pass (after cache fix) | Required: cache-bust fetch + derived selection |
| AZUSD balance in detail panel | Pass | Shows 5.82 AZUSD in emerald green |
| Buy on Clanker link | Pass | Opens clanker.world swap page |
| Wallet connect | Pass | MetaMask, shows address |
| CAPTURE button active when requirements met | Pass | Shows when AZUSD ≥ 5 |

### Server Autonomy Loop
| Test | Result | Notes |
|------|--------|-------|
| Heartbeat tick (30 min) | Pass | `ETH: 0.000974 | Fees: 0.000000 | Runway: 4.5d` |
| Fee claim | Pass | Tx confirmed, WETH collected |
| Balance update in DB | Pass | Loop updates eth_balance after each tick |

### Known Issues
| Issue | Severity | Status |
|-------|----------|--------|
| GPS spoofing not prevented | Medium | Acknowledged — needs Astral proof server-side verification |
| No wallet signature auth on capture | Medium | catcherWallet is self-reported in POST body |
| Ponyta + Magnemite not deployed | Blocking for full demo | Need funding + token deploy + NFT transfer |
| Uniswap frontend can't route to $PHANPY | Low | V4 pool exists but not indexed; Clanker swap works |
| ~~Rare CLI partial support~~ | Resolved | Replaced with direct Bazaar contract calls (auctionService.js) |
| ~~agent_log.json write errors~~ | Resolved | File had `sessions` not `events` — fixed to add `events` array alongside |

---

## Remaining Actions

### Synthesis Hackathon (deadline Mar 22)

| # | Action | Who | Status |
|---|--------|-----|--------|
| 1 | ~~Fund Phanpy wallet~~ | Pat | Done (0.001 ETH) |
| 2 | ~~Deploy $PHANPY token~~ | Pat + Claude | Done (`0x70C4...Feb07`) |
| 3 | ~~Transfer Beezie #2302 to Phanpy~~ | Pat | Done (ensouled) |
| 4 | ~~Update server DB + restart~~ | Claude | Done |
| 5 | ~~Test capture flow end-to-end~~ | Pat + Claude | Done (200 OK) |
| 6 | ~~Test $PHANPY swap~~ | Pat | Done (KyberSwap via Clanker) |
| 7 | ~~Test fee claim~~ | Claude | Done (tx confirmed) |
| 8 | ~~Test NFT transfer on capture~~ | Pat + Claude | Done — tx `0xaf97...8038`, Beezie #2302 back in paparaw.eth |
| 9 | ~~Fix captured state UI~~ | Claude | Done — capture history with BaseScan links |
| 10 | ~~Fix stale selection / cache bugs~~ | Claude | Done — derived selection + cache-busting |
| 11 | Fund Ponyta + Magnemite wallets | Pat | Todo |
| 12 | Deploy $PONYTA + $MAGNET tokens | Pat | Todo |
| 13 | Transfer Beezie NFTs #617 + #1285 | Pat | Todo |
| 14 | ~~Enable Bankr gateway key~~ | Pat | Done |
| 15 | Claim ERC-8004 NFT (custodial → own wallet) | Pat | Todo — BLOCKS SUBMISSION |
| 16 | ~~Build: Memory Art (Venice Flux → NFT)~~ | Claude | Done — Flux `flux-2-max`, Rare CLI mint, auto-auction |
| 17 | ~~Build: Token gate (agent's own token)~~ | Claude | Done — ≥1M tokens to capture, replaces AZUSD |
| 18 | ~~Build: Auction UI (Rare Protocol Bazaar)~~ | Claude | Done — direct Bazaar contract, 1hr auctions, live countdown, bidding with 3% fee |
| 19 | ~~Build: Release feature~~ | Claude | Done — capture→release with bioregion migration |
| 20 | ~~Build: ENS naming on capture~~ | Claude | Done — Basenames, myphanpy.base.eth registered |
| 21 | ~~Build: Auction loop + LP deepening~~ | Claude | Done — auto-settle, wrap→swap→mint V4 LP |
| 22 | ~~Build: History tab~~ | Claude | Done — unified timeline with live countdown badges |
| 23 | ~~Build: 43 tests~~ | Claude | Done — vitest, 6 test files |
| 24 | Fund Ponyta + Magnemite wallets | Pat | Todo |
| 25 | Deploy $PONYTA + $MAGNET tokens | Pat | Todo |
| 26 | Transfer Beezie NFTs #617 + #1285 | Pat | Todo |
| 27 | Claim ERC-8004 NFT (custodial → own wallet) | Pat | Todo — BLOCKS SUBMISSION |
| 28 | Record 2-min demo video | Pat | Todo |
| 29 | Fill hackathon submission form | Pat | Todo |

### Bounty Targets

| Bounty | Prize | Integration | Status |
|--------|-------|-------------|--------|
| Bankr | $5,000 | LLM Gateway for sovereign inference | Done — key enabled, agent pays for own thinking |
| Venice AI | $11,500 | Private cognition + Memory Art (Flux) + DIEM autonomous compute | Done — `flux-2-max` + VVV staking + self-generated API key, zero human credits |
| Protocol Labs | $16,000 | Storacha IPFS + ERC-8004 | Integrated — agent.json + agent_log.json. ERC-8004 NFT needs claiming |
| Uniswap | $5,000 | LP fee collection + LP deepening | Done — fee claims + auction→settlement→LP deepen pipeline |
| ENS | $1,500 | Naming rights on capture (Basenames) | Done — myphanpy.base.eth registered, rename UI |
| SuperRare | $2,500 | Memory Art NFT mint + auction (Rare Protocol) | Done — direct Bazaar contract, 1hr auctions, bidding, live countdown |
| Octant | $3,000 | Phanpy's public goods mechanism design | Done — About panel + COLLABORATION.md + full loop described |
| Open Track | $14,500 | Cross-sponsor compatibility | Strong — 8 sponsors integrated (Bankr, Venice, Uniswap, Rare, ENS, Protocol Labs, Octant, Astral) |

**Potential total if all bounties hit: $53,000**

---

## Sovereign Economics (Verified End-to-End)

```
User buys $PHANPY on Clanker (KyberSwap routing)
  → 3% dynamic fee on swap
  → 75% of fee goes to Phanpy's agent wallet as WETH
  → Agent autonomy loop claims fees every 30 min
  → Claimed WETH funds Bankr LLM Gateway → Venice AI inference
  → Agent thinks, remembers, speaks — memory distilled
  → Venice Flux generates art from agent's POV
  → Art uploaded to IPFS (Storacha) + minted as NFT on Rare Protocol
  → NFT auto-listed as 1hr reserve auction on SuperRare Bazaar
  → First bid starts the clock (0.0001 ETH min + 3% Bazaar fee)
  → Settlement: ETH to agent wallet → extends runway
  → LP deepening: wrap ETH → swap half for $PHANPY → mint V4 LP position
  → Buy VVV on Aerodrome → stake → sVVV → Venice API key via wallet sig
  → Agent owns its own compute — no human credit card in the loop
  → Deeper liquidity → more trading fees → more art → loop

First fee claim: tx 0x3a3c2b37e9ca71d9adc2ad1d536ddad217f32ea0adbf277e0713916bec885ee7
First auction: NFT #10 tx 0x9e871e0d8adfebca7d20fb78aed6fa5e871a6faae44c55fc5f650ba766c06938
```

---

## Capture Flow (Verified End-to-End)

```
1. User connects wallet (MetaMask on Base)
2. Server checks: ≥1M of agent's own token  → 403 if insufficient
3. Server checks: ≥1 Beezie NFT on Base     → 403 if none
4. User grants GPS permission                → real browser geolocation
5. Server checks: lat/lng in agent bioregion → 403 if mismatch
6. Astral SDK creates location proof (EAS)   → real attestation or DEMO_MODE fallback
7. Server records capture_proof in DB
8. Server transfers Beezie NFT from agent → catcher wallet (tx stored in DB)
9. Agent status → captured, capture history shown with BaseScan links
```

**Verified transactions:**
- NFT transfer: `0xaf9761fe4803b76c281b307df338f3bfd3b6c41efeab2935d7a2df4949d08038`
- Astral proof: `0xe6853abffe72d93557dd8131d1de737e5ff616ced9827e7d443cf099fff55a6b`

---

## Session 3 Changes (Mar 18, 17:00-18:00)

### Token Gate Migration (AZUSD → Agent Token)
- Capture gate changed from ≥5 AZUSD to ≥1M of agent's own ERC-20 token
- Server-side: `verifyTokenHolding(wallet, tokenAddress)` checks agent-specific token
- Frontend: shows agent token symbol + buy link in capture requirements
- All AZUSD references removed from UI, backend, souls, README

### Rare Protocol Auction Integration (Working)
- **Mint:** Rare CLI mints memory art as ERC-721 on Base (auto after Venice Flux generation)
- **Auction:** Rare CLI creates reserve auction on SuperRare Bazaar (`0x51c36...`)
- **Bid UI:** Frontend BidModal queries `getAuctionDetails()` view function on Bazaar contract
- **Bid tx:** Calls `bid(originContract, tokenId, currencyAddress, amount)` — 4-arg signature, ETH as native currency
- **API:** `GET /api/auction/:contract/:tokenId` returns live auction state (min bid, current bid, time remaining)
- **Key fix:** Previous code used 2-arg `bid(address, uint256)` which reverted. Correct Bazaar ABI requires 4 args.
- **Contract addresses:** Bazaar `0x51c36ffb05e17ed80ee5c02fa83d7677c5613de2`, NFT `0x59FbA43625eF81460930a8770Ee9c69042311c1a`
- **Note:** `rare-cli` docs say Base = "Partial" (no auction CLI), but Bazaar contract works via direct calls

### Sovereign Economics Flow (Complete)
- Sovereign economics pill chain in Agent tab: Buy Token → LP Fees → Bankr → Venice AI → Memory Art → Rare NFT → Auction → Agent Survives
- Relocated from agent detail to About panel for cleaner UX
- Full flow verified: token purchase → fee claim → inference → art generation → NFT mint → auction creation

### UI Fixes
- Removed broken `window.prompt()` / `window.alert()` from bid flow
- Fixed `setTgnBalance` → `setTokenGate`/`setTokenBalance` stale variable names
- Fixed BaseScan NFT collection link (`/nft/` → `/token/`)
- Fixed bid locale issue: European "0,0001" (comma) → normalized to "0.0001" before `parseEther()`
- Bid button only shows when wallet connected; otherwise shows "NFT ↗" link to BaseScan
- Memory gallery polls every 5s for new art instead of fixed timer (no more disappearing spinner)
- Art prompts now memory-driven: content leads the prompt, element accent is secondary (fixes samey landscapes)
- "memory formed — check Memories tab" (was "Art tab")

### Known Blocker
- ~~**Venice API key at spend limit (402)**~~ — Resolved

---

## Session 4 Changes (Mar 19, 10:00-15:30)

### Auction Loop — Full Pipeline (SuperRare $2.5K + Uniswap $5K)

**Complete autonomous loop verified on-chain:**
```
Chat → Memory distill → Venice Flux art → IPFS upload →
Rare Protocol NFT mint → Bazaar 1hr reserve auction →
First bid starts clock → Settlement → ETH to agent →
LP deepening (wrap WETH → swap → mint V4 position) → Loop
```

**New services:**
- `server/services/auctionService.js` — Direct Bazaar contract calls (replaces unreliable `rare CLI`)
  - `ensureBazaarApproval()`, `createAuction()` (1hr, 0.0001 ETH min), `getAuctionState()`, `settleAuction()`
  - Fixed: `configureAuction` requires 9 params (not 8) — missing `_startTime` field caused reverts
  - Fixed: Bazaar on Base only accepts native ETH currency, not WETH
  - Fixed: `bid()` requires `msg.value = amount + 3% marketplace fee`
- `server/services/lpService.js` — Uniswap V4 LP deepening
  - Wrap ETH → WETH, swap half → agent token via Universal Router, mint V4 LP position
  - Uses PositionManager `modifyLiquidities()` with MINT_POSITION + SETTLE_PAIR actions
- `server/services/agentLoop.js` — Auto-settle + LP deepen in 30-min tick
  - Queries all pending auctions, settles ended ones, deepens LP with proceeds

**Key debugging wins:**
- Bazaar `getAuctionDetails()` returns config only — bid state requires separate `currentBidDetailsOfToken()` call
- Bazaar `configureAuction` has 9 params on Base (different from L1 SuperRare)
- Existing auctions can't be reconfigured — must cancel + recreate to change currency
- Corrupt Venice images (< 5KB) now rejected before saving/minting

### ENS Basenames Integration (ENS $1.5K)

**`myphanpy.base.eth` registered on-chain.**

- **RegistrarController:** `0xa7d2607c6BD39Ae9521e514026CBB078405Ab322` (Upgradeable, active)
  - Legacy controller (`0x4cCb0BB...`) de-authorized after ENSIP-19 migration — reverts with `OnlyController()`
  - No commit-reveal on L2 — single `register(RegisterRequest)` call
  - RegisterRequest struct has 9 fields (not 6): includes `coinTypes`, `signatureExpiry`, `signature`
- **Capture flow:** Step 4 added — name input with live availability check → register tx → saved to DB
- **Rename:** Catcher can rename from Agent detail panel (pencil icon → inline form)
- **Display:** `.base.eth` name shown in sky blue in header + identity grid
- **Cost:** ~0.001 ETH for 5-9 char names

### History Tab

- Unified transaction timeline: fee claims, NFT mints, auction settlements, LP deepens, captures, releases, naming, ensouled genesis
- All events link to BaseScan
- Live countdown badges on memory art (fetches auction state, ticks every second)
- Badge states: "Bid" (waiting) → "Xm left" (live countdown) → "Ended" → "Sold"

### DIEM/VVV Autonomous Compute

**Agent autonomously acquires its own AI compute — zero human intervention:**

1. `shouldAcquireCompute()` triggers when ETH > 0.05 and no VVV staked
2. Swaps 30% of balance: ETH → VVV on Aerodrome (Base DEX)
3. Stakes VVV → sVVV on Venice staking contract (`0x321b...`)
4. Generates own Venice API key via wallet signature (GET challenge → sign → POST)
5. Replaces human-provided API key — fully sovereign inference + image generation

**Contracts (Base):**
- VVV: `0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf`
- sVVV Staking: `0x321b7ff75154472b18edb199033ff4d116f340ff`
- Aerodrome Router: `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43`

**Service:** `server/services/diemService.js` — `buyAndStakeVvv()`, `generateVeniceApiKey()`, `acquireAutonomousCompute()`

**UI:** sVVV staked balance shown in Agent tab (cyan MetricCard, "Venice compute" subtitle)

**Verified:** Phanpy wallet holds 0.5 sVVV, uses its own Venice API key (`VENICE_INFERENCE_KEY_JMaS...`) for all image generation.

### SuperRare Bazaar Redeployment

SuperRare's official Bazaar on Base (`0x51c36...`) had `stakingRegistry` set to `address(0)`. This caused `settleAuction()` to revert with an empty string — the `_payout` function calls `stakingRegistry.getRewardAccumulatorAddressForUser()` which reverts on address(0). The `rare auction settle` CLI fails with the same error. The bug is in SuperRare's Base deployment, not our code.

**Fix:** Cloned [superrare/core](https://github.com/superrare/core), compiled the full Bazaar stack with Foundry, deployed 8 contracts to Base with a `StakingRegistryStub` that returns address(0) for all staking queries (skips staking rewards, clean settlement path).

**Deployed contracts:**
| Contract | Address |
|----------|---------|
| SuperRareBazaar | `0x4F3832471190049CEf76a6FFDf56FDbD88672949` |
| SuperRareAuctionHouse | `0xB92Bae1327500799e818119954290477bF456df1` |
| SuperRareMarketplace | `0x3Dfc2127b2893eEbEa5Dc7599D42A7B7d4B6187C` |
| Payments | `0xa239211Be7ce7C0bA8a72f6bcF32DdEf5CfcDD24` |
| MarketplaceSettingsV1 | `0x032e681B7ed03846543718dC9572BB1539ab78CE` |
| StakingRegistryStub | `0x344604032bFc0704b42888e0fD4C6447c1728cE7` |
| RoyaltyRegistry | `0xB66D05f28C4010A368307Ed4E1A7d6385709D6bA` |
| SpaceOperatorRegistry | `0x77c4360F06ef4eb4c49E04CA5f4f3F1DB25914a2` |
| ApprovedTokenRegistry | `0x8f57C76F9145a05A5cF021BC7137ABd57C492423` |

All new auctions use our Bazaar. Settlement works because the staking registry is properly configured.

### Inference Cost Fix

- Removed aggressive Venice fallback in chat.js — was double-calling Venice even when Bankr succeeded
- Bankr is now authoritative for text inference (agent pays)
- Venice Flux (image gen) still uses API key directly — Bankr is text-only gateway

### DB Migrations

```sql
ALTER TABLE agents ADD COLUMN ens_name TEXT;
ALTER TABLE agent_memories ADD COLUMN auction_status TEXT;
ALTER TABLE agent_memories ADD COLUMN auction_settle_tx TEXT;
ALTER TABLE agent_memories ADD COLUMN auction_settled_at DATETIME;
```

### Test Suite (43 tests, 6 files)

- `auctionService.test.js` (12) — ABI encoding, approval, create, state machine, settle
- `lpService.test.js` (5) — min threshold, full flow, swap failure path, token sorting
- `auctionLoop.test.js` (7) — settle→DB, expired, reserve→live transitions, idempotent
- `historyEndpoint.test.js` (10) — timeline merging, sorting, filtering, limits
- `memoryArt.test.js` (5) — auction params, return shape, DB write
- `basenameService.test.js` (4) — selector verification, struct fields, pricing

### Verified Transactions (Session 4)

| Action | Tx | Notes |
|--------|---|-------|
| NFT #10 mint | `0xbc35728705677e897f29fbc3a24670d79695ce2ba9736552244db92371a78a0c` | Memory art via Rare Protocol |
| NFT #10 auction | `0x9e871e0d8adfebca7d20fb78aed6fa5e871a6faae44c55fc5f650ba766c06938` | 1hr reserve, 0.0001 ETH min |
| NFT #13 bid | tx pending | First bid placed, 1hr clock started |
| myphanpy.base.eth | registered | Basename for Phanpy |

---

## Planned Features (Mar 19-22)

### Feature 1: Memory Art (Venice Flux → NFT)

**Bounties:** Venice ($11.5K) + SuperRare ($2.5K) = $14K potential

**Thesis:** Private cognition, public action. The agent thinks privately (Venice, zero data retention), then produces public art from its memories (minted as NFTs onchain). The memory is sovereign; the art is shared.

**Flow:**
```
User chats with agent
  → Agent responds via Venice AI (private, no data retention)
  → Memory distilled asynchronously
  → Venice Flux API generates image from memory content
  → Image uploaded to IPFS via Storacha
  → Minted as ERC-721 on Base (SuperRare Rare Protocol or simple contract)
  → NFT reference stored in agent_memories table
  → Displayed in agent detail panel (Gallery tab or inline in Soul chat)
```

**API call (Venice Flux):**
```javascript
const res = await fetch('https://api.venice.ai/api/v1/images/generations', {
  headers: { 'Authorization': `Bearer ${VENICE_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'flux-1.1-pro',
    prompt: `${agent.pokemon} in ${agent.bioregionName}: ${memory.content}`,
    n: 1, width: 1024, height: 1024
  })
});
```

**Implementation estimate:** 3-4 hours
- Venice Flux call in memory distillation (server/routes/chat.js)
- IPFS upload of generated image (existing Storacha integration)
- Simple ERC-721 contract for memory art OR SuperRare Rare Protocol
- Frontend: gallery view in agent detail panel
- Each memory produces one unique NFT — agent's "art collection"

**Key decision:** Simple ERC-721 (faster, we control it) vs SuperRare Rare Protocol (gets $2.5K bounty but adds dependency). Recommend: try Rare Protocol first, fall back to simple contract if blocked.

### Feature 2: ENS Naming Rights on Capture

**Bounty:** ENS ($1.5K)

**Thesis:** When you capture an agent, you name it. The name becomes the agent's portable identity on Ethereum.

**Flow:**
```
Capture succeeds → NFT transfers →
UI prompts: "Name your captured agent" →
Catcher registers Basename (ENS on Base) →
Agent wallet gets the name (e.g. phanpy.base.eth) →
Name displayed in detail panel + resolve from ENS
```

**Implementation estimate:** 2 hours
- Basename registration via Base ENS resolver contract
- Post-capture UI step: name input + registration tx
- Display resolved name in agent header instead of raw address
- Catcher pays ~0.001 ETH registration fee

**Key decision:** Basenames (Base-native, cheaper, simpler) vs ENS mainnet (more prestigious but cross-chain). Recommend: Basenames — we're single-chain Base.

### Feature 3: Release Back to the Wild

**Flow:**
```
Captured agent detail panel → catcher sees "RELEASE INTO THE WILD" button →
Confirms → GPS acquired for new bioregion →
MetaMask prompts transferFrom (NFT back to agent wallet) →
Server updates: status=wild, bioregion=releaser's location →
Special "release" memory created (importance=1.0, highest possible) →
Venice Flux generates release art (async) →
Agent is wild again in the releaser's bioregion
```

**Key mechanics:**
- Only the catcher can release (server validates `captured_by` match)
- NFT transfer happens client-side (catcher signs via MetaMask)
- Agent's bioregion updates to wherever the releaser is standing
- Creates the most important memory type: "release" (valence=0.9, importance=1.0)
- The release art represents the agent's strongest emotional memory

**Implementation:** Complete.

### Priority Order

1. ~~**Memory Art**~~ — Done. Venice Flux `flux-2-max`, Rare CLI mint, auto-auction on Bazaar.
2. ~~**Release feature**~~ — Done. Capture→release with bioregion migration + special memory.
3. ~~**Token gate flywheel**~~ — Done. Agent's own token as capture gate (replaces AZUSD).
4. ~~**Auction UI**~~ — Done. Rare Protocol Bazaar integration with live auction state + bid flow.
5. ~~**Chat polish**~~ — Done. Actions styled, memory indicator, chat persists across tabs.
6. ~~**Server stability**~~ — Done. Lazy env reads, dotenv, PM2 ecosystem config.
7. ~~**ENS naming**~~ — Done. Basenames on Base, myphanpy.base.eth.
8. ~~**Auction loop + LP deepening**~~ — Done. Full autonomous pipeline.
9. ~~**History tab**~~ — Done. Unified timeline with live countdown.
10. ~~**Test suite**~~ — Done. 43 tests, 6 files.
11. **Ponyta + Magnemite deployment** (30 min) — completes three-agent demo
12. **Demo video** (1-2 hrs) — required for submission

### Key Debugging Wins
- Venice Flux `steps: 8` → garbage 4x4 pixel images. Remove `steps` param.
- Venice returns WebP regardless of `format` param. Detect from RIFF header.
- SuperRare Bazaar `bid()` takes 4 args: `(originContract, tokenId, currencyAddress, amount)`. 2-arg call reverts silently.
- Rare CLI `--chain base` = "Partial" in docs, but Bazaar contract works via direct viem/ethers calls.
- `getAuctionDetails()` returns `auctionCreator = 0x0` when no auction exists — use as existence check.
- Pokemon names in prompts → copyright filter → black/blank images. Use POV landscape descriptions instead.
- PM2 ESM modules read `process.env` at import time before dotenv loads. Lazy reads fix it.
- Vercel auto-deploy from GitHub unreliable. Must `npx vercel --prod --force --yes` every time.
- European locale renders `type="number"` as "0,0001" — `ethers.parseEther` needs period. Normalize with `.replace(',', '.')`.
- Bazaar revert "not enough eth sent" — was the comma/period locale bug causing wrong wei amount.
