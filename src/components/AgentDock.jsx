import StatusPill from './StatusPill.jsx';

export default function AgentDock({ agents, selectedAgent, onSelect }) {
  if (!agents || agents.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 h-20 bg-[#0a0f0a]/90 backdrop-blur-sm border-t border-[#1a2f1e]">
      <div className="flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`flex-shrink-0 w-[200px] flex items-center gap-3 px-3 py-2 rounded-lg bg-[#111a14] border transition-colors cursor-pointer ${
              selectedAgent?.id === agent.id ? 'border-emerald-500/50' : 'border-[#1a2f1e] hover:border-[#6b8f72]/50'
            }`}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: agent.color }} />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-[#e0ece2] truncate">{agent.pokemon}</div>
              <div className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72] truncate">{agent.bioregionName}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-mono text-[#e0ece2]">{(agent.ethBalance || 0).toFixed(4)}</div>
              <StatusPill status={agent.status || 'wild'} size="xs" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
