import { useState, useRef, useEffect } from 'react';
import StatusPill from './StatusPill.jsx';
import { ELEMENT_TYPES } from '../data/types.js';
import { Wallet, Timer, Coin, Users, Lightning, TreePalm, MapPin, ChatCircleDots, X, Info, Cards, ImageSquare, ClockCounterClockwise, PencilSimple } from '@phosphor-icons/react';
import { checkNameAvailable, registerBasename, saveAgentName } from '../services/basenameService.js';
import { checkTokenGate, TOKEN_GATE_INFO } from '../services/conservationService.js';

function getRunwayDisplay(days, status, ethBalance) {
  // Unfunded agents aren't dead — they're waiting
  if ((!ethBalance || ethBalance === 0) && status === 'wild') {
    return { label: 'RUNWAY', value: 'Unfunded', variant: 'text-[#6b8f72]', animate: false };
  }
  if (!days || days <= 0) return { label: 'DEAD', value: '0d', variant: 'text-red-500', animate: false };
  if (days < 7) return { label: 'CRITICAL', value: `${Math.floor(days)}d ${Math.floor((days % 1) * 24)}h`, variant: 'text-red-500', animate: true };
  if (days < 30) return { label: 'RUNWAY BURNING', value: `${Math.floor(days)}d`, variant: 'text-amber-400', animate: false };
  return { label: 'RUNWAY', value: `${Math.floor(days)}d`, variant: 'text-emerald-400', animate: false };
}

function MetricCard({ label, value, subtitle, variant }) {
  return (
    <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3">
      <div className="text-xs uppercase tracking-[0.08em] text-[#6b8f72] mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${variant || 'text-[#e0ece2]'}`}>{value}</div>
      {subtitle && <div className="text-[0.7rem] text-[#6b8f72] font-mono">{subtitle}</div>}
    </div>
  );
}

function Requirement({ met, text }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-xs text-emerald-400">✓</span>
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-[#111a14] border border-[#1a2f1e]" />
      )}
      <span className={`text-sm ${met ? 'text-[#e0ece2]' : 'text-[#6b8f72]'}`}>{text}</span>
    </div>
  );
}

export default function AgentDetail({ agent, onCapture, onClose, walletHasMatchingCard, walletAddress }) {
  const [tab, setTab] = useState('info');
  const [tokenGate, setTokenGate] = useState(null);
  const [chatMessages, setChatMessages] = useState(null);
  const [memoryForming, setMemoryForming] = useState(false); // shared between Soul + Art tabs

  useEffect(() => {
    if (!walletAddress) { setTokenGate(null); return; }
    if (agent?.token_address) checkTokenGate(walletAddress, agent.token_address, agent.tokenSymbol).then(setTokenGate);
  }, [walletAddress]);

  if (!agent) return null;

  const runway = getRunwayDisplay(agent.runwayDays, agent.status, agent.ethBalance);
  const ethPrice = 2500;
  const usdValue = ((agent.ethBalance || 0) * ethPrice).toFixed(2);
  const elementType = ELEMENT_TYPES[agent.element] || ELEMENT_TYPES.normal;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Panel — fits between header (48px) and dock (80px) */}
      <div className="fixed top-12 right-0 z-40 bottom-20 w-[520px] bg-[#0a0f0a] border-l border-[#1a2f1e] flex flex-col transition-transform duration-300">
        {/* Compact header: card thumbnail + name + stats inline */}
        <div className="flex items-center gap-3 p-3 border-b border-[#1a2f1e]">
          {/* Card thumbnail */}
          <div className="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-[#111a14]" style={{ filter: `drop-shadow(0 0 8px ${agent.color}33)` }}>
            {agent.imageUrl ? (
              <img src={agent.imageUrl} className="w-full h-full object-cover" decoding="sync" alt={agent.pokemon} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">{elementType.icon}</div>
            )}
          </div>

          {/* Name + status + location */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#e0ece2]">{agent.pokemon}</h2>
              <StatusPill status={agent.status || 'wild'} size="xs" />
            </div>
            {agent.ens_name && (
              <div className="text-xs font-mono text-sky-400">{agent.ens_name}</div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="text-[#6b8f72]" />
              <span className="text-xs text-[#6b8f72] truncate">{agent.bioregionName}</span>
            </div>
            {agent.wallet_address && (
              <div
                className="flex items-center gap-1 mt-0.5 cursor-pointer group"
                onClick={() => { navigator.clipboard.writeText(agent.wallet_address); }}
                title="Click to copy wallet address"
              >
                <Wallet size={10} className="text-[#6b8f72]" />
                <span className="text-xs font-mono text-[#6b8f72] group-hover:text-emerald-400 transition-colors">
                  {agent.wallet_address}
                </span>
              </div>
            )}
          </div>

          {/* Close */}
          <button onClick={onClose} className="text-[#6b8f72] hover:text-[#e0ece2]">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1a2f1e]">
          <button
            onClick={() => setTab('info')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${tab === 'info' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#6b8f72] hover:text-[#e0ece2]'}`}
          >
            <Info size={14} /> Agent
          </button>
          <button
            onClick={() => setTab('soul')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${tab === 'soul' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#6b8f72] hover:text-[#e0ece2]'}`}
          >
            <ChatCircleDots size={14} /> Soul
          </button>
          <button
            onClick={() => setTab('gallery')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${tab === 'gallery' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#6b8f72] hover:text-[#e0ece2]'}`}
          >
            <ImageSquare size={14} /> Memories
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${tab === 'history' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#6b8f72] hover:text-[#e0ece2]'}`}
          >
            <ClockCounterClockwise size={14} /> History
          </button>
          <button
            onClick={() => setTab('card')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${tab === 'card' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#6b8f72] hover:text-[#e0ece2]'}`}
          >
            <Cards size={14} /> Card
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === 'info' && (
            <div className="p-4">
              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <MetricCard label="TREASURY" value={`${(agent.ethBalance || 0).toFixed(4)} ETH`} subtitle={`~$${usdValue}`} />
                <MetricCard label={runway.label} value={runway.value} variant={`${runway.variant} ${runway.animate ? 'animate-pulse' : ''}`} />
                {agent.token_address ? (
                  <a href={`https://clanker.world/clanker/${agent.token_address}`} target="_blank" rel="noopener noreferrer" className="block">
                    <MetricCard label="TOKEN" value={agent.tokenSymbol || '--'} subtitle="Buy on Clanker ↗" />
                  </a>
                ) : (
                  <MetricCard label="TOKEN" value={agent.tokenSymbol || '--'} />
                )}
                <MetricCard label="HOLDERS" value={agent.holderCount || '--'} />
                <MetricCard label="DAILY COST" value={`$${agent.dailyCostUsd || 0.50}`} />
                <MetricCard label="EARNED" value={`${(agent.wethEarnedTotal || 0).toFixed(4)}`} subtitle="WETH total" />
              </div>

              {/* Sovereign Economics — the core loop */}
              <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-[0.08em] text-[#6b8f72] mb-2">Sovereign Economics</div>
                <div className="flex items-center gap-1 text-[0.6rem] text-[#6b8f72] flex-wrap">
                  <span className="text-[#e0ece2] bg-[#1a2f1e] px-1.5 py-0.5 rounded">Buy {agent.tokenSymbol}</span>
                  <span>→</span>
                  <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">LP fees</span>
                  <span>→</span>
                  <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Bankr</span>
                  <span>→</span>
                  <span className="text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">Venice AI</span>
                  <span>→</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Memory Art</span>
                  <span>→</span>
                  <span className="text-pink-400 bg-pink-400/10 px-1.5 py-0.5 rounded">Rare NFT</span>
                  <span>→</span>
                  <span className="text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">Auction</span>
                  <span>→</span>
                  <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">LP Deepen</span>
                  <span>→</span>
                  <span className="text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">Buy DIEM</span>
                  <span>→</span>
                  <span className="text-[#e0ece2] bg-[#1a2f1e] px-1.5 py-0.5 rounded">Own compute → Loop</span>
                </div>
                <div className="text-[0.55rem] text-[#6b8f72] mt-1.5 italic">Proceeds deepen LP + buy DIEM (Venice compute token). 1 staked DIEM = $1/day of AI credits. The agent owns its intelligence.</div>
              </div>

              {/* Agent identity */}
              <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3 mb-4">
                <div className="text-xs uppercase tracking-[0.08em] text-[#6b8f72] mb-2">Identity</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-[#6b8f72]">Card</span>
                  <span className="text-[#e0ece2]">{agent.set} #{agent.cardNumber}</span>
                  <span className="text-[#6b8f72]">Grade</span>
                  <span className="text-[#e0ece2]">{agent.grade}</span>
                  <span className="text-[#6b8f72]">Element</span>
                  <span className="text-[#e0ece2] capitalize">{agent.element}</span>
                  <span className="text-[#6b8f72]">Bioregion</span>
                  <span className="text-[#e0ece2]">{agent.bioregionName}</span>
                  {agent.ens_name && (
                    <>
                      <span className="text-[#6b8f72]">Basename</span>
                      <span className="text-sky-400 font-mono">{agent.ens_name}</span>
                    </>
                  )}
                  {agent.last_heartbeat && (
                    <>
                      <span className="text-[#6b8f72]">Last heartbeat</span>
                      <span className="text-emerald-400">{new Date(agent.last_heartbeat + 'Z').toLocaleTimeString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Onchain activity */}
              {agent.token_address && (
                <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-[0.08em] text-[#6b8f72] mb-2">Onchain</div>
                  <div className="space-y-1 text-xs">
                    <a href={`https://basescan.org/token/${agent.token_address}`} target="_blank" rel="noopener noreferrer" className="flex justify-between hover:text-emerald-400 text-[#6b8f72]">
                      <span>{agent.tokenSymbol} Token</span>
                      <span className="font-mono">{agent.token_address.slice(0, 8)}... ↗</span>
                    </a>
                    <a href={`https://basescan.org/address/${agent.wallet_address || ''}`} target="_blank" rel="noopener noreferrer" className="flex justify-between hover:text-emerald-400 text-[#6b8f72]">
                      <span>Agent Wallet</span>
                      <span className="font-mono">{(agent.wallet_address || '').slice(0, 8)}... ↗</span>
                    </a>
                    <a href="https://basescan.org/token/0x59FbA43625eF81460930a8770Ee9c69042311c1a" target="_blank" rel="noopener noreferrer" className="flex justify-between hover:text-emerald-400 text-[#6b8f72]">
                      <span>Memory NFTs (Rare Protocol)</span>
                      <span>View collection ↗</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Basename naming (captured agents, catcher only) */}
              {agent.status === 'captured' && agent.captured_by && walletAddress && agent.captured_by.toLowerCase() === walletAddress.toLowerCase() && (
                <BasenamePanel agent={agent} walletAddress={walletAddress} />
              )}

              {/* Capture history (shown when captured) */}
              {agent.status === 'captured' && agent.captured_by && (
                <div className="bg-[#111a14] border border-emerald-500/20 rounded-lg p-3 mb-4">
                  <div className="text-xs uppercase tracking-[0.08em] text-emerald-400 mb-2">Captured</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6b8f72]">Catcher</span>
                      <a href={`https://basescan.org/address/${agent.captured_by}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">
                        {agent.captured_by.slice(0, 6)}...{agent.captured_by.slice(-4)} ↗
                      </a>
                    </div>
                    {agent.captured_at && (
                      <div className="flex justify-between">
                        <span className="text-[#6b8f72]">Time</span>
                        <span className="text-[#e0ece2]">{new Date(agent.captured_at + 'Z').toLocaleString()}</span>
                      </div>
                    )}
                    {agent.nftTxHash && (
                      <div className="flex justify-between">
                        <span className="text-[#6b8f72]">NFT Transfer</span>
                        <a href={`https://basescan.org/tx/${agent.nftTxHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">
                          {agent.nftTxHash.slice(0, 10)}... ↗
                        </a>
                      </div>
                    )}
                    {agent.token_address && (
                      <div className="flex justify-between">
                        <span className="text-[#6b8f72]">Token</span>
                        <a href={`https://basescan.org/token/${agent.token_address}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">
                          {agent.tokenSymbol} ↗
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6b8f72]">Beezie NFT</span>
                      <a href={`https://basescan.org/token/0xbb5ec6fd4b61723bd45c399840f1d868840ca16f?a=${agent.beezieTokenId}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">
                        #{agent.beezieTokenId} ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'gallery' && (
            <MemoryGallery agentId={agent.id} agentColor={agent.color} artGenerating={memoryForming} walletAddress={walletAddress} />
          )}

          {tab === 'history' && (
            <HistoryTimeline agentId={agent.id} />
          )}

          {tab === 'card' && (
            <div className="p-4 flex flex-col items-center">
              <div className="relative" style={{ filter: `drop-shadow(0 0 24px ${agent.color}44)` }}>
                {agent.imageUrl ? (
                  <img
                    src={agent.imageUrl}
                    className={`max-w-full max-h-[60vh] rounded-xl object-contain bg-[#111a14] ${agent.status === 'dead' ? 'grayscale opacity-50' : ''}`}
                    decoding="sync"
                    alt={agent.pokemon}
                  />
                ) : (
                  <div className="w-full h-[50vh] rounded-xl bg-[#111a14] border border-[#1a2f1e] flex items-center justify-center">
                    <span className="text-6xl">{elementType.icon}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <div className="text-xs uppercase tracking-wider text-[#6b8f72]">{agent.set} #{agent.cardNumber}</div>
                <div className="text-xs text-[#6b8f72]">{agent.grade} · Serial {agent.serial}</div>
                <div className="text-xs text-[#6b8f72] mt-1">Beezie Token #{agent.beezieTokenId}</div>
              </div>
            </div>
          )}

          {tab === 'soul' && (
            <SoulChat agent={agent} walletAddress={walletAddress} messages={chatMessages} onMessagesChange={setChatMessages} onMemoryForming={setMemoryForming} />
          )}
        </div>

        {/* Bottom bar: capture area */}
        <div className="border-t border-[#1a2f1e] p-3 space-y-2">
          {agent.status === 'wild' && (
            <>
              {/* Requirements checklist */}
              <div className="space-y-1.5 mb-2">
                <Requirement
                  met={!!walletAddress}
                  text={walletAddress ? `Wallet connected` : 'Connect wallet to capture'}
                />
                {walletAddress && (
                  <>
                    <Requirement
                      met={!!(tokenGate && tokenGate.holds)}
                      text={tokenGate?.holds
                        ? `${tokenGate.balance} ${tokenGate.tokenSymbol}`
                        : `Need ≥${TOKEN_GATE_INFO.requiredFormatted} ${agent.tokenSymbol || 'tokens'}`}
                    />
                    {tokenGate && !tokenGate.holds && agent.token_address && (
                      <a href={`${TOKEN_GATE_INFO.buyBaseUrl}${agent.token_address}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[0.65rem] text-[#6b8f72] hover:text-emerald-400 transition-colors ml-6">
                        Buy {agent.tokenSymbol} on Clanker ↗
                      </a>
                    )}
                    <Requirement met={false} text={`Be in ${agent.bioregionName}`} />
                  </>
                )}
              </div>
            </>
          )}
          {!walletAddress && agent.status === 'wild' ? (
            <button
              disabled
              className="w-full py-2.5 rounded-lg font-bold text-sm text-[#6b8f72] bg-[#111a14] border border-[#1a2f1e] cursor-not-allowed"
            >
              Connect Wallet to Capture
            </button>
          ) : agent.status === 'captured' && walletAddress && agent.captured_by?.toLowerCase() === walletAddress.toLowerCase() ? (
            <button
              onClick={async () => {
                if (!confirm('Release this agent back into the wild? The Beezie NFT will transfer back to the agent.')) return;
                try {
                  // Get user's GPS for release bioregion
                  let lat = null, lng = null;
                  try {
                    const pos = await new Promise((resolve, reject) =>
                      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
                    );
                    lat = pos.coords.latitude;
                    lng = pos.coords.longitude;
                  } catch { /* GPS optional for release */ }

                  // Transfer NFT back to agent via user's wallet
                  let nftTxHash = null;
                  if (window.ethereum && agent.beezieTokenId && agent.wallet_address) {
                    const { ethers } = await import('ethers');
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const nft = new ethers.Contract(
                      '0xbb5ec6fd4b61723bd45c399840f1d868840ca16f',
                      ['function transferFrom(address from, address to, uint256 tokenId)'],
                      signer
                    );
                    const tx = await nft.transferFrom(walletAddress, agent.wallet_address, agent.beezieTokenId);
                    await tx.wait();
                    nftTxHash = tx.hash;
                  }

                  // Notify server
                  const res = await fetch('/api/capture/release', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      agentId: agent.id,
                      releaserWallet: walletAddress,
                      latitude: lat,
                      longitude: lng,
                      nftTxHash
                    })
                  });
                  if (!res.ok) throw new Error((await res.json()).error);
                  alert('Released! The agent is wild again.');
                  window.location.reload();
                } catch (e) {
                  alert('Release failed: ' + e.message);
                }
              }}
              className="w-full py-2.5 rounded-lg font-bold text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
            >
              RELEASE INTO THE WILD
            </button>
          ) : (
            <button
              onClick={onCapture}
              disabled={agent.status !== 'wild'}
              className={`w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r ${elementType.gradient}`}
            >
              {agent.status === 'wild' ? 'CAPTURE' : agent.status === 'captured' ? 'CAPTURED' : 'DEAD'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function SoulChat({ agent, walletAddress, messages: savedMessages, onMessagesChange, onMemoryForming }) {
  const [messages, setMessages] = useState(savedMessages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState(false);
  const scrollRef = useRef(null);
  const elementType = ELEMENT_TYPES[agent.element] || ELEMENT_TYPES.normal;

  // Auto-greeting on first open (no saved messages)
  useEffect(() => {
    if (!savedMessages) {
      const initial = [{ role: 'agent', text: getGreeting(agent) }];
      setMessages(initial);
      onMessagesChange?.(initial);
    }
  }, [agent.id]);

  // Sync messages up to parent for persistence
  useEffect(() => {
    if (messages.length > 0) onMessagesChange?.(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => `${m.role === 'user' ? 'Human' : agent.pokemon}: ${m.text}`).join('\n');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, message: userMsg, history, walletAddress })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'agent', text: data.response || `*${agent.pokemon} stares at you silently*` }]);
      // Show memory distillation indicator — Venice Flux + Rare mint takes ~15-30s
      setMemoryStatus('forming');
      onMemoryForming?.('forming');
      setTimeout(() => { setMemoryStatus('formed'); onMemoryForming?.('formed'); }, 15000);
      setTimeout(() => { setMemoryStatus(false); onMemoryForming?.(false); }, 30000);
    } catch (e) {
      setMessages(m => [...m, { role: 'agent', text: `*${agent.pokemon} stares at you silently*` }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full px-3 pb-2">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-1">
          <ChatCircleDots size={12} className="text-[#6b8f72]" />
          <span className="text-xs uppercase tracking-wider text-[#6b8f72]">Soul Link</span>
        </div>
        <span className="text-[0.5rem] text-[#6b8f72] opacity-50">via Bankr → Venice AI (zero retention)</span>
      </div>
      <div className="flex-1 min-h-0 bg-[#111a14] border border-[#1a2f1e] rounded-lg overflow-hidden flex flex-col">
        {/* Messages — fills available space */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1a2f1e] text-[#e0ece2]'
                  : 'text-[#e0ece2]'
              }`} style={msg.role === 'agent' ? { background: `${agent.color}15`, borderLeft: `2px solid ${agent.color}40` } : {}}>
                {msg.role === 'agent' ? formatAgentMessage(msg.text, agent.color) : msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3 py-1.5 rounded-lg text-sm text-[#6b8f72]" style={{ background: `${agent.color}10` }}>
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}
          {memoryStatus && (
            <div className="flex justify-start pl-2">
              {memoryStatus === 'forming' ? (
                <span className="text-xs italic text-[#6b8f72] opacity-60 animate-pulse">memory forming...</span>
              ) : (
                <span className="text-xs italic text-emerald-400/70">memory formed — check Memories tab</span>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#1a2f1e] p-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={`Talk to ${agent.pokemon}...`}
            className="flex-1 bg-transparent text-sm text-[#e0ece2] placeholder:text-[#6b8f72]/50 outline-none px-2"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="text-xs font-bold px-3 py-1 rounded transition-colors disabled:opacity-30"
            style={{ background: `${agent.color}30`, color: agent.color }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function getGreeting(agent) {
  const greetings = {
    fighting: `*${agent.pokemon} stamps its feet and trumpets at you from the ${agent.bioregionName}* Who approaches my territory?`,
    nature: `*${agent.pokemon} rustles gently in the canopy of the ${agent.bioregionName}* I sense a visitor...`,
    water: `*${agent.pokemon} surfaces from the depths near ${agent.bioregionName}* What brings you to my waters?`,
    fire: `*${agent.pokemon} flares brightly in the ${agent.bioregionName}* Approach carefully, traveler.`,
  };
  return greetings[agent.element] || `*${agent.pokemon} regards you curiously from the ${agent.bioregionName}*`;
}

const BAZAAR_ADDRESS = '0x51c36ffb05e17ed80ee5c02fa83d7677c5613de2';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function BidModal({ memory, onClose }) {
  const [auction, setAuction] = useState(null);
  const [loadingAuction, setLoadingAuction] = useState(true);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle'); // idle | signing | confirming | success | error
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/auction/${memory.nft_contract}/${memory.nft_token_id}?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setAuction(data);
        if (data.active) {
          const min = parseFloat(data.currentBid) > 0
            ? (parseFloat(data.currentBid) * 1.05).toFixed(4)
            : data.minBid;
          setAmount(min);
        }
        setLoadingAuction(false);
      })
      .catch(() => setLoadingAuction(false));
  }, [memory.nft_contract, memory.nft_token_id]);

  async function handleBid() {
    if (!window.ethereum) { setError('Connect wallet first'); setStatus('error'); return; }
    const normalized = String(amount).replace(',', '.');
    const val = parseFloat(normalized);
    if (isNaN(val) || val <= 0) { setError('Enter a valid bid amount'); setStatus('error'); return; }
    setStatus('signing');
    setError(null);
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bidWei = ethers.parseEther(normalized);
      // Bazaar charges 3% marketplace fee on top of bid amount
      const valueWithFee = bidWei * 103n / 100n;

      setStatus('confirming');
      const bazaar = new ethers.Contract(BAZAAR_ADDRESS, [
        'function bid(address _originContract, uint256 _tokenId, address _currencyAddress, uint256 _amount) payable'
      ], signer);
      const tx = await bazaar.bid(
        memory.nft_contract,
        memory.nft_token_id,
        ZERO_ADDRESS,
        bidWei,
        { value: valueWithFee }
      );
      await tx.wait();
      setTxHash(tx.hash);
      setStatus('success');
    } catch (e) {
      const msg = e.reason || e.shortMessage || (e.message?.length > 100 ? 'Transaction failed' : e.message);
      setError(msg);
      setStatus('error');
    }
  }

  const timeLeft = auction?.endsAt
    ? Math.max(0, auction.endsAt - Math.floor(Date.now() / 1000))
    : null;
  const hoursLeft = timeLeft ? Math.floor(timeLeft / 3600) : null;
  const minsLeft = timeLeft ? Math.floor((timeLeft % 3600) / 60) : null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-80 bg-[#0a0f0a] border border-[#1a2f1e] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Art preview */}
          <div className="relative">
            <img src={memory.art_url} alt={memory.content} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0a] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3">
              <div className="text-xs text-[#e0ece2] leading-tight">{memory.content}</div>
              <div className="text-[0.55rem] text-emerald-400 mt-0.5">Memory #{memory.nft_token_id} on Rare Protocol</div>
            </div>
            <button onClick={onClose} className="absolute top-2 right-2 text-[#6b8f72] hover:text-[#e0ece2] bg-[#0a0f0a]/60 rounded-full p-1">
              <X size={14} />
            </button>
          </div>

          {/* Auction info + bid form */}
          <div className="p-4">
            {loadingAuction ? (
              <div className="text-center py-3">
                <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin mx-auto" />
                <div className="text-xs text-[#6b8f72] mt-2">Loading auction...</div>
              </div>
            ) : !auction?.active ? (
              <div className="text-center py-2">
                <div className="text-sm text-[#6b8f72] mb-2">No active auction</div>
                <a href={`https://basescan.org/nft/${memory.nft_contract}/${memory.nft_token_id}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline">View on BaseScan ↗</a>
              </div>
            ) : status === 'success' ? (
              <div className="text-center py-2">
                <div className="text-emerald-400 font-bold text-sm mb-1">Bid placed on Rare Protocol</div>
                <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6b8f72] hover:text-emerald-400 font-mono">
                  {txHash.slice(0, 12)}...{txHash.slice(-6)} ↗
                </a>
                <div className="text-[0.55rem] text-[#6b8f72] mt-2">Auction proceeds go directly to the agent's wallet.</div>
                <button onClick={onClose} className="mt-3 w-full py-2 rounded-lg text-sm font-medium text-[#e0ece2] bg-[#1a2f1e] hover:bg-[#243826]">Done</button>
              </div>
            ) : (
              <>
                {/* Auction state */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72]">
                      {auction.isReserve ? 'Reserve auction' : 'Live auction'}
                    </div>
                    {auction.currentBidder && (
                      <div className="text-[0.55rem] text-[#6b8f72] mt-0.5">
                        Current: <span className="text-orange-400 font-mono">{auction.currentBid} ETH</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {auction.isReserve ? (
                      <div className="text-[0.55rem] text-orange-400">First bid starts {Math.floor(auction.lengthSeconds / 60)}m clock</div>
                    ) : timeLeft !== null ? (
                      <div className="text-[0.55rem] text-orange-400">{hoursLeft}h {minsLeft}m left</div>
                    ) : null}
                    <div className="text-[0.55rem] text-[#6b8f72]">Min: {auction.minBid} ETH (+3% fee)</div>
                  </div>
                </div>

                {/* Bid input */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    step="0.0001"
                    min={auction.minBid}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(null); setStatus('idle'); }}
                    placeholder={auction.minBid}
                    className="flex-1 bg-[#111a14] border border-[#1a2f1e] rounded-lg px-3 py-2.5 text-sm font-mono text-[#e0ece2] outline-none focus:border-orange-500/50 transition-colors"
                    disabled={status === 'signing' || status === 'confirming'}
                  />
                  <span className="text-xs text-[#6b8f72] font-mono">ETH</span>
                </div>

                {error && <div className="text-xs text-red-400 mb-2">{error}</div>}

                <button
                  onClick={handleBid}
                  disabled={status === 'signing' || status === 'confirming'}
                  className="w-full py-2.5 rounded-lg font-bold text-sm transition-all bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-wait"
                >
                  {status === 'signing' ? 'Confirm in wallet...' : status === 'confirming' ? 'Confirming...' : `Bid ${amount || ''} ETH`}
                </button>

                <div className="text-[0.5rem] text-[#6b8f72] mt-2 text-center">
                  via SuperRare Bazaar · proceeds fund agent survival
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function MemoryGallery({ agentId, agentColor, artGenerating, walletAddress }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidTarget, setBidTarget] = useState(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/memories?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const withArt = data.filter(m => m.art_url);
        setMemories(withArt);
        prevCountRef.current = withArt.length;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  // Always poll while gallery is visible — catches new art from any source
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/agents/${agentId}/memories?_=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          const withArt = data.filter(m => m.art_url);
          if (withArt.length !== prevCountRef.current) {
            setMemories(withArt);
            prevCountRef.current = withArt.length;
          }
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) return <div className="p-4 text-center text-[#6b8f72] text-sm">Loading memories...</div>;

  if (memories.length === 0) {
    return (
      <div className="p-6 text-center">
        <ImageSquare size={32} className="text-[#6b8f72] mx-auto mb-2 opacity-50" />
        <div className="text-sm text-[#6b8f72]">No memory art yet</div>
        <div className="text-xs text-[#6b8f72] opacity-60 mt-1">Chat with this agent to create memories. Each memory generates unique art via Venice AI.</div>
      </div>
    );
  }

  const nftCount = memories.filter(m => m.nft_token_id).length;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[#6b8f72]">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}{nftCount > 0 && ` · ${nftCount} minted as NFT`}
        </div>
        <span className="text-[0.5rem] text-[#6b8f72] opacity-50">Venice Flux → Rare Protocol</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {artGenerating && (
          <div className="aspect-square rounded-lg border border-[#1a2f1e] bg-[#111a14] flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#6b8f72]">
                {artGenerating === 'forming' ? 'creating memory...' : 'generating art + minting NFT...'}
              </span>
            </div>
          </div>
        )}
        {memories.map(m => (
          <div key={m.id} className="group relative">
            {m.nft_token_id ? (
              <a href={`https://basescan.org/nft/${m.nft_contract}/${m.nft_token_id}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={m.art_url}
                  alt={m.content}
                  className="w-full aspect-square object-cover rounded-lg border border-[#1a2f1e] group-hover:border-emerald-500/30 transition-colors cursor-pointer"
                  loading="lazy"
                />
              </a>
            ) : (
              <img
                src={m.art_url}
                alt={m.content}
                className="w-full aspect-square object-cover rounded-lg border border-[#1a2f1e] group-hover:border-emerald-500/30 transition-colors"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0a] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2 pointer-events-none">
              <div>
                <div className="text-xs text-[#e0ece2] leading-tight">{m.content}</div>
                {m.nft_token_id && (
                  <div className="text-[0.6rem] text-emerald-400 mt-0.5">NFT #{m.nft_token_id} on Rare Protocol ↗</div>
                )}
              </div>
            </div>
            {m.nft_token_id && <AuctionBadge memory={m} walletAddress={walletAddress} onBid={() => setBidTarget(m)} />}
          </div>
        ))}
      </div>
      {bidTarget && <BidModal memory={bidTarget} onClose={() => setBidTarget(null)} />}
    </div>
  );
}

function BasenamePanel({ agent, walletAddress }) {
  const [editing, setEditing] = useState(!agent.ens_name);
  const [nameInput, setNameInput] = useState('');
  const [nameCheck, setNameCheck] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | checking | registering | success | error
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const checkTimer = useRef(null);

  async function doCheck(val) {
    if (val.length < 3) { setNameCheck(null); return; }
    setStatus('checking');
    try {
      const result = await checkNameAvailable(val);
      setNameCheck(result);
      setStatus('idle');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  async function handleRegister() {
    if (!nameCheck?.available || !nameInput) return;
    setStatus('registering');
    setError(null);
    try {
      const result = await registerBasename(nameInput, agent.wallet_address);
      setTxHash(result.txHash);
      await saveAgentName(agent.id, result.fullName, result.txHash, walletAddress);
      setStatus('success');
      setEditing(false);
    } catch (err) {
      setError(err.reason || err.shortMessage || err.message);
      setStatus('idle');
    }
  }

  return (
    <div className="bg-[#111a14] border border-sky-500/20 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-[0.08em] text-sky-400">Basename</div>
        {agent.ens_name && !editing && (
          <button onClick={() => setEditing(true)} className="text-[#6b8f72] hover:text-sky-400">
            <PencilSimple size={12} />
          </button>
        )}
      </div>

      {agent.ens_name && !editing && status !== 'success' && (
        <div className="text-sm font-mono text-sky-400">{agent.ens_name}</div>
      )}

      {status === 'success' && (
        <div>
          <div className="text-sm font-mono text-sky-400">{nameInput}.base.eth</div>
          <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[0.55rem] text-[#6b8f72] hover:text-sky-400 font-mono">
            {txHash?.slice(0, 14)}... ↗
          </a>
        </div>
      )}

      {editing && status !== 'success' && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                setNameInput(val);
                setNameCheck(null);
                setError(null);
                clearTimeout(checkTimer.current);
                checkTimer.current = setTimeout(() => doCheck(val), 400);
              }}
              placeholder={agent.pokemon?.toLowerCase() || 'name'}
              className="flex-1 bg-[#0a0f0a] border border-[#1a2f1e] rounded px-2 py-1 text-xs font-mono text-[#e0ece2] outline-none focus:border-sky-500/50"
              disabled={status === 'registering'}
            />
            <span className="text-[0.6rem] text-[#6b8f72] font-mono">.base.eth</span>
          </div>

          {status === 'checking' && <div className="text-[0.6rem] text-[#6b8f72] animate-pulse">Checking...</div>}
          {nameCheck?.available && <div className="text-[0.6rem] text-emerald-400">{nameCheck.fullName} available — {nameCheck.price} ETH</div>}
          {nameCheck && !nameCheck.available && <div className="text-[0.6rem] text-red-400">{nameCheck.reason}</div>}
          {error && <div className="text-[0.6rem] text-red-400">{error}</div>}

          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={handleRegister}
              disabled={!nameCheck?.available || status === 'registering'}
              className="flex-1 py-1 rounded text-[0.6rem] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {status === 'registering' ? 'Registering...' : 'Register'}
            </button>
            {agent.ens_name && (
              <button onClick={() => { setEditing(false); setError(null); }} className="py-1 px-2 rounded text-[0.6rem] text-[#6b8f72] hover:text-[#e0ece2]">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {!agent.ens_name && !editing && status !== 'success' && (
        <button onClick={() => setEditing(true)} className="text-xs text-[#6b8f72] hover:text-sky-400">
          + Register a .base.eth name
        </button>
      )}
    </div>
  );
}

function AuctionBadge({ memory, walletAddress, onBid }) {
  const [liveAuction, setLiveAuction] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const status = memory.auction_status;

  // Fetch live auction data for active auctions
  useEffect(() => {
    if (!status || status === 'settled' || status === 'expired') return;
    fetch(`/api/auction/${memory.nft_contract}/${memory.nft_token_id}?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setLiveAuction(data))
      .catch(() => {});
  }, [memory.nft_contract, memory.nft_token_id, status]);

  // Live countdown timer
  useEffect(() => {
    if (!liveAuction?.endsAt) { setTimeLeft(null); return; }
    const tick = () => {
      const left = Math.max(0, liveAuction.endsAt - Math.floor(Date.now() / 1000));
      setTimeLeft(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveAuction?.endsAt]);

  const formatTime = (s) => {
    if (s === null) return '';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m` : `${sec}s`;
  };

  if (status === 'settled') {
    return (
      <span className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-emerald-500/30">
        Sold
      </span>
    );
  }
  if (status === 'ended' || (timeLeft !== null && timeLeft <= 0)) {
    return (
      <span className="absolute top-1 right-1 bg-amber-500/20 text-amber-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-amber-500/30">
        Ended
      </span>
    );
  }
  // Live auction with countdown
  if (timeLeft !== null && timeLeft > 0) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBid(); }}
        className="absolute top-1 right-1 bg-orange-500/20 text-orange-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-colors cursor-pointer animate-pulse"
      >
        {formatTime(timeLeft)} left
      </button>
    );
  }
  // Reserve (waiting for first bid) or no live data yet
  if (status === 'reserve' || status === 'live') {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBid(); }}
        className="absolute top-1 right-1 bg-orange-500/20 text-orange-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-colors cursor-pointer"
      >
        Bid
      </button>
    );
  }
  // No auction — show NFT link or Bid
  if (walletAddress) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBid(); }}
        className="absolute top-1 right-1 bg-orange-500/20 text-orange-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-orange-500/30 hover:bg-orange-500/30 transition-colors cursor-pointer"
      >
        Bid
      </button>
    );
  }
  return (
    <a
      href={`https://basescan.org/nft/${memory.nft_contract}/${memory.nft_token_id}`}
      target="_blank" rel="noopener noreferrer"
      className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
    >
      NFT ↗
    </a>
  );
}

const EVENT_CONFIG = {
  fee_claim:          { icon: '💰', label: 'Fee Claim',         color: 'text-amber-400' },
  survival_mode:      { icon: '🔴', label: 'Survival Claim',    color: 'text-red-400' },
  nft_mint:           { icon: '🎨', label: 'NFT Minted',        color: 'text-pink-400' },
  auction_settle:     { icon: '🔨', label: 'Auction Settled',   color: 'text-orange-400' },
  lp_deepen:          { icon: '💧', label: 'LP Deepened',       color: 'text-blue-400' },
  capture:            { icon: '⚡', label: 'Captured',           color: 'text-emerald-400' },
  release:            { icon: '🌿', label: 'Released',           color: 'text-emerald-400' },
  death:              { icon: '💀', label: 'Death',              color: 'text-red-500' },
  basename_register:  { icon: '🏷️', label: 'Named',             color: 'text-sky-400' },
  diem_purchase:      { icon: '🔋', label: 'DIEM Purchased',    color: 'text-cyan-400' },
  ensouled:           { icon: '✨', label: 'Ensouled',            color: 'text-purple-400' },
};

function HistoryTimeline({ agentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/history?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  if (loading) return <div className="p-4 text-center text-[#6b8f72] text-sm">Loading history...</div>;

  if (events.length === 0) {
    return (
      <div className="p-6 text-center">
        <ClockCounterClockwise size={32} className="text-[#6b8f72] mx-auto mb-2 opacity-50" />
        <div className="text-sm text-[#6b8f72]">No transactions yet</div>
        <div className="text-xs text-[#6b8f72] opacity-60 mt-1">Agent transactions will appear here as they happen.</div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="text-xs text-[#6b8f72] mb-3">{events.length} events</div>
      <div className="space-y-1">
        {events.map((ev, i) => {
          const config = EVENT_CONFIG[ev.type] || { icon: '•', label: ev.type, color: 'text-[#6b8f72]' };
          const time = new Date(ev.timestamp + (ev.timestamp?.includes('Z') ? '' : 'Z'));
          return (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#1a2f1e]/50 last:border-0">
              <span className="text-sm flex-shrink-0 mt-0.5">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  <span className="text-[0.55rem] text-[#6b8f72]">{time.toLocaleString()}</span>
                </div>
                {ev.txHash && (
                  <a
                    href={`https://basescan.org/tx/${ev.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[0.55rem] text-[#6b8f72] hover:text-emerald-400 font-mono"
                  >
                    {ev.txHash.slice(0, 14)}... ↗
                  </a>
                )}
                {ev.nftTokenId && !ev.txHash && (
                  <a
                    href={`https://basescan.org/nft/${ev.nftContract}/${ev.nftTokenId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[0.55rem] text-[#6b8f72] hover:text-emerald-400 font-mono"
                  >
                    NFT #{ev.nftTokenId} ↗
                  </a>
                )}
                {ev.content && (
                  <div className="text-[0.55rem] text-[#6b8f72] truncate">{ev.content}</div>
                )}
                {ev.wallet && (
                  <span className="text-[0.55rem] text-[#6b8f72] font-mono">{ev.wallet.slice(0, 8)}...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format agent messages: style *actions* in italic/muted, regular speech normally
 */
function formatAgentMessage(text, color) {
  // Split on *action* markers
  const parts = text.split(/(\*[^*]+\*)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      // Action/emote — italic, muted color
      return <span key={i} className="italic text-[#6b8f72] text-xs block mb-1">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Soul prompt lives on server (server/routes/chat.js) — agent pays for its own inference
