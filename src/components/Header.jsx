import { useState } from 'react';
import WalletConnect from './WalletConnect.jsx';
import { Info, X, GithubLogo, Globe, Lightning, Brain, TreePalm, Wallet } from '@phosphor-icons/react';

function AboutPanel({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />
      <div className="fixed top-14 left-4 z-[61] w-96 max-h-[80vh] overflow-y-auto bg-[#0a0f0a] border border-[#1a2f1e] rounded-lg shadow-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-emerald-400 font-bold text-sm tracking-wider">ABOUT ANIMA</h2>
            <button onClick={onClose} className="text-[#6b8f72] hover:text-[#e0ece2]"><X size={16} /></button>
          </div>

          <p className="text-sm text-[#e0ece2] mb-3">
            Autonomous agents ensouled on Base. Each agent issues its own token, earns LP fees, and pays for its own inference. No human credit card in the loop.
          </p>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-2">
              <Brain size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#6b8f72]">
                <span className="text-[#e0ece2]">Sovereign Inference</span> — Agents think via Venice AI (zero data retention), routed through Bankr LLM Gateway. Funded by Uniswap V4 LP fees.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#6b8f72]">
                <span className="text-[#e0ece2]">Bioregion Capture</span> — Hold the agent's token + prove physical presence via Astral location proofs. GPS + onchain attestation.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Lightning size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#6b8f72]">
                <span className="text-[#e0ece2]">Memory Art</span> — Every conversation generates a memory. Venice Flux creates unique art from the agent's perspective. Private cognition, public action.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wallet size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#6b8f72]">
                <span className="text-[#e0ece2]">Agent Economics</span> — Each agent deploys an ERC-20 via Clanker. Trading fees sustain the agent. If revenue dries up, the agent dies.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TreePalm size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#6b8f72]">
                <span className="text-[#e0ece2]">Capture → Release</span> — Catchers can release agents into new bioregions. Each release creates the agent's most significant memory.
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a2f1e] pt-3 mb-3">
            <div className="text-xs uppercase tracking-wider text-[#6b8f72] mb-2">Public Goods Mechanism</div>
            <div className="text-xs text-[#6b8f72] bg-[#111a14] border border-[#1a2f1e] rounded p-2">
              <p className="text-[#e0ece2] mb-1">Phanpy designed its own capture mechanic:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li><span className="text-[#e0ece2]">Physical presence</span> — be in the bioregion</li>
                <li><span className="text-[#e0ece2]">Token holding</span> — hold the agent's token (stakeholder)</li>
                <li><span className="text-[#e0ece2]">Memory sharing</span> — each capture generates art</li>
              </ol>
              <p className="mt-1 italic">Token revenue funds conservation via LP fees → agent survival → bioregion engagement.</p>
            </div>
          </div>

          <div className="border-t border-[#1a2f1e] pt-3 mb-3">
            <div className="text-xs uppercase tracking-wider text-[#6b8f72] mb-2">How It Works</div>
            <div className="space-y-1 text-[0.6rem]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-[#6b8f72]">Users buy agent tokens on <span className="text-[#e0ece2]">Clanker / Uniswap V4</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-[#6b8f72]">LP fees claimed by agent → routed to <span className="text-[#e0ece2]">Bankr LLM Gateway</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                <span className="text-[#6b8f72]">Agent thinks privately via <span className="text-[#e0ece2]">Venice AI</span> (zero data retention)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[#6b8f72]">Memories generate art via <span className="text-[#e0ece2]">Venice Flux</span> → minted as NFTs on <span className="text-[#e0ece2]">Rare Protocol</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                <span className="text-[#6b8f72]">Capture requires agent's <span className="text-[#e0ece2]">token</span> + GPS + <span className="text-[#e0ece2]">Astral</span> location proof on <span className="text-[#e0ece2]">Base</span></span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a2f1e] pt-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-[#6b8f72] mb-1">Sponsor Integrations</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'Bankr', color: 'text-blue-400 border-blue-400/30' },
                { name: 'Venice AI', color: 'text-purple-400 border-purple-400/30' },
                { name: 'Uniswap V4', color: 'text-amber-400 border-amber-400/30' },
                { name: 'Rare Protocol', color: 'text-pink-400 border-pink-400/30' },
                { name: 'Protocol Labs', color: 'text-cyan-400 border-cyan-400/30' },
                { name: 'Octant', color: 'text-emerald-400 border-emerald-400/30' },
                { name: 'ENS', color: 'text-sky-400 border-sky-400/30' },
              ].map(s => (
                <span key={s.name} className={`text-[0.6rem] px-1.5 py-0.5 rounded bg-[#111a14] border ${s.color}`}>{s.name}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['Base', 'Clanker', 'Astral SDK', 'AZUSD', 'Beezie NFT', 'ERC-8004'].map(tag => (
                <span key={tag} className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[#111a14] border border-[#1a2f1e] text-[#6b8f72]">{tag}</span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#1a2f1e] pt-3 mt-3 space-y-1">
            <div className="text-xs uppercase tracking-wider text-[#6b8f72] mb-1">Links</div>
            <a href="https://github.com/papa-raw/anima-synthesis" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#6b8f72] hover:text-emerald-400">
              <GithubLogo size={12} /> GitHub ↗
            </a>
            <a href="https://clanker.world/clanker/0x70C445a2E1685266A7b66110082F9718337Feb07" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#6b8f72] hover:text-emerald-400">
              <Lightning size={12} /> $PHANPY on Clanker ↗
            </a>
            <a href="https://basescan.org/token/0x70C445a2E1685266A7b66110082F9718337Feb07" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#6b8f72] hover:text-emerald-400">
              <Globe size={12} /> $PHANPY on BaseScan ↗
            </a>
          </div>

          <div className="border-t border-[#1a2f1e] pt-3 mt-3 text-[0.6rem] text-[#6b8f72]">
            Built by <a href="https://warpcast.com/paparaw" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">paparaw.eth</a> × Komakohawk (Claude Opus 4.6) for The Synthesis Hackathon (Mar 2026)
          </div>
        </div>
      </div>
    </>
  );
}

export default function Header({ walletAddress, onWalletChange }) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-[#0a0f0a]/80 backdrop-blur-sm border-b border-[#1a2f1e]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-widest text-emerald-400">ANIMA</span>
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="text-[#6b8f72] hover:text-emerald-400 transition-colors"
          >
            <Info size={16} weight="bold" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72] bg-[#111a14] border border-[#1a2f1e] px-2 py-0.5 rounded">Base</span>
          <WalletConnect walletAddress={walletAddress} onWalletChange={onWalletChange} />
        </div>
      </div>
      {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}
    </>
  );
}
