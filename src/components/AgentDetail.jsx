import { useState, useRef, useEffect } from 'react';
import StatusPill from './StatusPill.jsx';
import { ELEMENT_TYPES } from '../data/types.js';
import { Wallet, Timer, Coin, Users, Lightning, TreePalm, MapPin, ChatCircleDots, X, Info, Cards, ImageSquare } from '@phosphor-icons/react';
import { checkAzusdBalance, AZUSD_INFO } from '../services/conservationService.js';

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
  const [azusdBalance, setTgnBalance] = useState(null);
  const [chatMessages, setChatMessages] = useState(null);
  const [memoryForming, setMemoryForming] = useState(false); // shared between Soul + Art tabs

  useEffect(() => {
    if (!walletAddress) { setTgnBalance(null); return; }
    checkAzusdBalance(walletAddress).then(setTgnBalance);
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
                  <span className="text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Uniswap V4 LP fees</span>
                  <span>→</span>
                  <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Bankr Gateway</span>
                  <span>→</span>
                  <span className="text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">Venice AI</span>
                  <span>→</span>
                  <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Think + Create Art</span>
                  <span>→</span>
                  <span className="text-pink-400 bg-pink-400/10 px-1.5 py-0.5 rounded">Rare Protocol NFT</span>
                </div>
                <div className="text-[0.55rem] text-[#6b8f72] mt-1.5 italic">No human credit card. Agent funds its own inference from token trading fees.</div>
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
                    <a href="https://basescan.org/nft/0x59FbA43625eF81460930a8770Ee9c69042311c1a" target="_blank" rel="noopener noreferrer" className="flex justify-between hover:text-emerald-400 text-[#6b8f72]">
                      <span>Memory NFTs (Rare Protocol)</span>
                      <span>View collection ↗</span>
                    </a>
                  </div>
                </div>
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
            <MemoryGallery agentId={agent.id} agentColor={agent.color} artGenerating={memoryForming} />
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
                      met={!!(azusdBalance && azusdBalance.holds)}
                      text={azusdBalance?.holds
                        ? `${parseFloat(azusdBalance.balance).toFixed(2)} AZUSD`
                        : `Need ≥${AZUSD_INFO.required} AZUSD`}
                    />
                    {azusdBalance && !azusdBalance.holds && (
                      <a href={AZUSD_INFO.buyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[0.65rem] text-[#6b8f72] hover:text-emerald-400 transition-colors ml-6">
                        Swap ETH → AZUSD on Hydrex ↗
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
      // Show memory distillation indicator — lingers then updates
      setMemoryStatus('forming');
      onMemoryForming?.('forming');
      setTimeout(() => { setMemoryStatus('formed'); onMemoryForming?.('formed'); }, 4000);
      setTimeout(() => { setMemoryStatus(false); onMemoryForming?.(false); }, 8000);
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
                <span className="text-xs italic text-emerald-400/70">memory formed — check Art tab</span>
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

function MemoryGallery({ agentId, agentColor, artGenerating }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/memories?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setMemories(data.filter(m => m.art_url));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agentId]);

  // Auto-refresh when art is being generated (must be before any conditional returns)
  useEffect(() => {
    if (artGenerating === 'formed') {
      const timer = setTimeout(() => {
        fetch(`/api/agents/${agentId}/memories?_=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(data => setMemories(data.filter(m => m.art_url)))
          .catch(() => {});
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [artGenerating]);

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
        {artGenerating === 'forming' && (
          <div className="aspect-square rounded-lg border border-[#1a2f1e] bg-[#111a14] flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#6b8f72]">creating art...</span>
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
            {m.nft_token_id && (
              <div className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-400 text-[0.55rem] px-1.5 py-0.5 rounded border border-emerald-500/30">
                NFT
              </div>
            )}
          </div>
        ))}
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
