import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import Globe from './components/Globe.jsx';
import AgentDock from './components/AgentDock.jsx';
import AgentDetail from './components/AgentDetail.jsx';
import CaptureFlow from './components/CaptureFlow.jsx';
import { getAgents } from './services/agentApi.js';
import { getMatchingCard } from './services/beezieService.js';
import { initBrowserAstral } from './services/astralService.js';
import { AGENTS } from './data/agents.js';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function InfoOrb() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-4 z-30 w-10 h-10 rounded-full bg-[#111a14] border border-[#1a2f1e] flex items-center justify-center text-[#6b8f72] hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
      >
        <span className="text-sm font-bold">i</span>
      </button>
      {open && (
        <div className="fixed bottom-36 right-4 z-30 w-80 bg-[#0a0f0a] border border-[#1a2f1e] rounded-lg p-4 text-sm">
          <div className="text-emerald-400 font-bold mb-2">Anima — Synthesis Hackathon</div>
          <p className="text-[#6b8f72] mb-2">
            Autonomous Pokemon agents ensouled on Base. Each agent issues its own token to fund its survival.
            Capture them by proving you're physically in their bioregion with an Astral location proof —
            but only if you hold a matching-type Beezie NFT.
          </p>
          <p className="text-[#6b8f72] mb-2">
            <span className="text-[#e0ece2]">Ensoulment</span> → <span className="text-[#e0ece2]">Release</span> → <span className="text-[#e0ece2]">Capture</span>
          </p>
          <div className="text-[0.6rem] text-[#6b8f72] mt-2 pt-2 border-t border-[#1a2f1e]">
            Built by paparaw.eth × Komakohawk (Claude Opus 4.6)
          </div>
          <button onClick={() => setOpen(false)} className="absolute top-2 right-3 text-[#6b8f72] hover:text-[#e0ece2]">✕</button>
        </div>
      )}
    </>
  );
}
const POLL_INTERVAL = 30000; // 30s

export default function App() {
  const [agents, setAgents] = useState(AGENTS); // Start with static data
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [captureMode, setCaptureMode] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletHasMatchingCard, setWalletHasMatchingCard] = useState(false);

  // Poll agents from server — merge API data with static definitions (for center, color, imageUrl)
  useEffect(() => {
    async function fetchAgents() {
      try {
        const data = await getAgents();
        if (data && data.length > 0) {
          // Merge: API data (live) + static data (center, color, imageUrl)
          const merged = data.map(apiAgent => {
            const staticAgent = AGENTS.find(s => s.id === apiAgent.id) || {};
            return {
              ...staticAgent,                    // center, color, imageUrl, etc.
              ...apiAgent,                       // live data from server overrides
              center: staticAgent.center || [0, 0],
              color: staticAgent.color || '#94a3b8',
              imageUrl: staticAgent.imageUrl || null,
              bioregionName: apiAgent.bioregion_name || staticAgent.bioregionName || '',
              ethBalance: apiAgent.eth_balance || 0,
              runwayDays: apiAgent.runway_days || 0,
              dailyCostUsd: apiAgent.daily_cost_usd || 0.50,
              tokenSymbol: apiAgent.token_symbol || staticAgent.tokenSymbol || '--',
              wethEarnedTotal: apiAgent.weth_earned_total || 0,
              holderCount: apiAgent.holder_count || 0,
              nftTxHash: apiAgent.nft_tx_hash || null,
              beezieTokenId: apiAgent.beezie_token_id || staticAgent.beezieTokenId,
            };
          });
          // Also include static agents not in API (Ponyta/Magnemite if not seeded on server)
          const mergedIds = new Set(merged.map(a => a.id));
          const remaining = AGENTS.filter(a => !mergedIds.has(a.id));
          const allAgents = [...merged, ...remaining];

          setAgents(allAgents);
        }
      } catch (e) {
        // Server not running — use static data
        console.warn('Server not available, using static agent data');
      }
    }
    fetchAgents();
    const interval = setInterval(fetchAgents, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Derive selectedAgent from agents list — always fresh after poll
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) || null : null;

  // Initialize Astral SDK when wallet connects
  useEffect(() => {
    if (walletAddress && window.ethereum) {
      initBrowserAstral().then(sdk => {
        if (sdk) console.log('Astral SDK initialized for real proofs');
        else console.warn('Astral SDK init failed — proofs will be simulated');
      });
    }
  }, [walletAddress]);

  // Check wallet for matching card when agent selected
  useEffect(() => {
    if (!walletAddress || !selectedAgent) {
      setWalletHasMatchingCard(false);
      return;
    }
    getMatchingCard(walletAddress, selectedAgent.element)
      .then(card => setWalletHasMatchingCard(!!card))
      .catch(() => setWalletHasMatchingCard(false));
  }, [walletAddress, selectedAgent]);

  const handleAgentSelect = useCallback((agent) => {
    setSelectedAgentId(agent?.id || null);
    setCaptureMode(false);
  }, []);

  const handleCapture = useCallback(() => {
    setCaptureMode(true);
  }, []);

  const handleCaptureSuccess = useCallback((result) => {
    setCaptureMode(false);
    setSelectedAgentId(null);
    // Refresh agents to get updated status
    getAgents().then(data => { if (data?.length) setAgents(data); }).catch(() => {});
  }, []);

  const handleCaptureCancel = useCallback(() => {
    setCaptureMode(false);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedAgentId(null);
    setCaptureMode(false);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <Header walletAddress={walletAddress} onWalletChange={setWalletAddress} />

      <Globe
        agents={agents}
        selectedAgent={selectedAgent}
        onAgentSelect={handleAgentSelect}
        dimmed={captureMode}
      />

      <AgentDock
        agents={agents}
        selectedAgent={selectedAgent}
        onSelect={handleAgentSelect}
      />

      {/* Info button — bottom right above dock */}
      <InfoOrb />

      {selectedAgent && !captureMode && (
        <AgentDetail
          agent={selectedAgent}
          onCapture={handleCapture}
          onClose={handleCloseDetail}
          walletHasMatchingCard={walletHasMatchingCard}
          walletAddress={walletAddress}
        />
      )}

      {captureMode && selectedAgent && walletAddress && (
        <CaptureFlow
          agent={selectedAgent}
          walletAddress={walletAddress}
          onSuccess={handleCaptureSuccess}
          onCancel={handleCaptureCancel}
          demoMode={DEMO_MODE}
        />
      )}
    </div>
  );
}
