import { useState, useRef, useEffect } from 'react';
import StatusPill from './StatusPill.jsx';
import { ELEMENT_TYPES } from '../data/types.js';
// Soul chat goes through server (agent pays for its own inference)

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
      <div className="text-[0.6rem] uppercase tracking-[0.08em] text-[#6b8f72] mb-1">{label}</div>
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
          <span className="text-[0.5rem] text-emerald-400">✓</span>
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-[#111a14] border border-[#1a2f1e]" />
      )}
      <span className={`text-sm ${met ? 'text-[#e0ece2]' : 'text-[#6b8f72]'}`}>{text}</span>
    </div>
  );
}

export default function AgentDetail({ agent, onCapture, onClose, walletHasMatchingCard }) {
  if (!agent) return null;

  const runway = getRunwayDisplay(agent.runwayDays, agent.status, agent.ethBalance);
  const ethPrice = 2500; // TODO: fetch from CoinGecko
  const usdValue = ((agent.ethBalance || 0) * ethPrice).toFixed(2);
  const elementType = ELEMENT_TYPES[agent.element] || ELEMENT_TYPES.normal;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Panel — fits between header (48px) and dock (80px) */}
      <div className="fixed top-12 right-0 z-40 bottom-20 w-[520px] bg-[#0a0f0a] border-l border-[#1a2f1e] overflow-y-auto transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a2f1e]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#e0ece2]">{agent.pokemon}</h2>
            <StatusPill status={agent.status || 'wild'} />
          </div>
          <button onClick={onClose} className="text-[#6b8f72] hover:text-[#e0ece2] text-xl">✕</button>
        </div>

        {/* Card + Metrics side by side */}
        <div className="p-4 flex gap-4">
          {/* Card image — compact */}
          <div className="flex-shrink-0 relative" style={{ filter: `drop-shadow(0 0 16px ${agent.color}33)` }}>
            {agent.imageUrl ? (
              <img
                src={agent.imageUrl}
                onError={(e) => { if (agent.imageUrlFallback) e.target.src = agent.imageUrlFallback; }}
                className={`w-[140px] h-[196px] rounded-lg object-cover bg-[#111a14] ${agent.status === 'dead' ? 'grayscale opacity-50' : ''}`}
                decoding="sync"
                alt={agent.pokemon}
              />
            ) : (
              <div className="w-[140px] h-[196px] rounded-lg bg-[#111a14] border border-[#1a2f1e] flex items-center justify-center">
                <span className="text-3xl">{elementType.icon}</span>
              </div>
            )}
            {agent.status === 'dead' && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-red-500">DEAD</span>
              </div>
            )}
          </div>

          {/* Right side: element + key metrics */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: agent.color }} />
              <span className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72]">
                {agent.element} · {agent.bioregionName}
              </span>
            </div>
            <MetricCard label="TREASURY" value={`${(agent.ethBalance || 0).toFixed(4)} ETH`} subtitle={`~$${usdValue}`} />
            <MetricCard label={runway.label} value={runway.value} variant={`${runway.variant} ${runway.animate ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          <MetricCard label="TOKEN" value={agent.tokenSymbol || '--'} />
          <MetricCard label="HOLDERS" value={agent.holderCount || '--'} />
          <MetricCard label="DAILY COST" value={`$${agent.dailyCostUsd || 0.50}`} />
        </div>

        {/* Capture CTA */}
        <div className="px-4 pb-4">
          <button
            onClick={onCapture}
            disabled={agent.status !== 'wild'}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r ${elementType.gradient} hover:shadow-lg`}
            style={{ '--tw-shadow-color': `${agent.color}33` }}
          >
            {agent.status === 'wild' ? 'CAPTURE THIS AGENT' : agent.status === 'captured' ? 'ALREADY CAPTURED' : 'AGENT IS DEAD'}
          </button>
        </div>

        {/* Requirements */}
        <div className="px-4 pb-4 space-y-2">
          <div className="text-[0.65rem] uppercase tracking-wider text-[#6b8f72] mb-1">Requirements</div>
          <Requirement met={false} text="Hold $TGN on Base (funds tree planting)" />
          <Requirement met={false} text="Physical presence in bioregion (GPS + Astral proof)" />
        </div>

        {/* Soul Chat */}
        <SoulChat agent={agent} />
      </div>
    </>
  );
}

function SoulChat({ agent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const elementType = ELEMENT_TYPES[agent.element] || ELEMENT_TYPES.normal;

  // Auto-greeting on mount
  useEffect(() => {
    setMessages([{
      role: 'agent',
      text: getGreeting(agent)
    }]);
  }, [agent.id]);

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
        body: JSON.stringify({ agentId: agent.id, message: userMsg, history })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'agent', text: data.response || `*${agent.pokemon} stares at you silently*` }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'agent', text: `*${agent.pokemon} stares at you silently*` }]);
    }
    setLoading(false);
  }

  return (
    <div className="px-4 pb-4">
      <div className="text-[0.65rem] uppercase tracking-wider text-[#6b8f72] mb-2">Soul Link</div>
      <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-2 scrollbar-hide">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1a2f1e] text-[#e0ece2]'
                  : 'text-[#e0ece2]'
              }`} style={msg.role === 'agent' ? { background: `${agent.color}15`, borderLeft: `2px solid ${agent.color}40` } : {}}>
                {msg.text}
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

// Soul prompt lives on server (server/routes/chat.js) — agent pays for its own inference
