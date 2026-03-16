import { useState, useRef, useEffect } from 'react';
import StatusPill from './StatusPill.jsx';
import { ELEMENT_TYPES } from '../data/types.js';
import { Wallet, Timer, Coin, Users, Lightning, TreePalm, MapPin, ChatCircleDots, X } from '@phosphor-icons/react';

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

export default function AgentDetail({ agent, onCapture, onClose, walletHasMatchingCard, walletAddress }) {
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
              <span className="text-[0.6rem] text-[#6b8f72] truncate">{agent.bioregionName}</span>
            </div>
            {agent.wallet_address && (
              <div
                className="flex items-center gap-1 mt-0.5 cursor-pointer group"
                onClick={() => { navigator.clipboard.writeText(agent.wallet_address); }}
                title="Click to copy wallet address"
              >
                <Wallet size={10} className="text-[#6b8f72]" />
                <span className="text-[0.55rem] font-mono text-[#6b8f72] group-hover:text-emerald-400 transition-colors">
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

        {/* Compact metric strip */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1a2f1e] text-[0.65rem]">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#111a14]" title="Treasury">
            <Wallet size={12} className="text-[#6b8f72]" />
            <span className="font-mono text-[#e0ece2]">{(agent.ethBalance || 0).toFixed(4)}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded bg-[#111a14] ${runway.variant}`} title="Runway">
            <Timer size={12} />
            <span className="font-mono">{runway.value}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#111a14]" title="Token">
            <Coin size={12} className="text-[#6b8f72]" />
            <span className="font-mono text-[#e0ece2]">{agent.tokenSymbol || '--'}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#111a14]" title="Holders">
            <Users size={12} className="text-[#6b8f72]" />
            <span className="font-mono text-[#e0ece2]">{agent.holderCount || '--'}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#111a14]" title="Daily cost">
            <Lightning size={12} className="text-[#6b8f72]" />
            <span className="font-mono text-[#e0ece2]">${agent.dailyCostUsd || 0.50}</span>
          </div>
        </div>

        {/* Soul Chat — THE HERO, takes remaining space */}
        <div className="flex-1 min-h-0">
          <SoulChat agent={agent} walletAddress={walletAddress} />
        </div>

        {/* Bottom bar: capture + requirements */}
        <div className="border-t border-[#1a2f1e] p-3 space-y-2">
          <div className="flex items-center gap-2 text-[0.6rem] text-[#6b8f72]">
            <TreePalm size={12} /> <span>Hold $TGN</span>
            <span className="text-[#1a2f1e]">|</span>
            <MapPin size={12} /> <span>Be in bioregion</span>
          </div>
          <button
            onClick={onCapture}
            disabled={agent.status !== 'wild'}
            className={`w-full py-2 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r ${elementType.gradient}`}
          >
            {agent.status === 'wild' ? 'CAPTURE' : agent.status === 'captured' ? 'CAPTURED' : 'DEAD'}
          </button>
        </div>
      </div>
    </>
  );
}

function SoulChat({ agent, walletAddress }) {
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
        body: JSON.stringify({ agentId: agent.id, message: userMsg, history, walletAddress })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'agent', text: data.response || `*${agent.pokemon} stares at you silently*` }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'agent', text: `*${agent.pokemon} stares at you silently*` }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full px-3 pb-2">
      <div className="flex items-center gap-1 py-2">
        <ChatCircleDots size={12} className="text-[#6b8f72]" />
        <span className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72]">Soul Link</span>
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
