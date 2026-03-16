import { useState, useEffect } from 'react';
import StatusPill from './StatusPill.jsx';
import { getMatchingCard } from '../services/beezieService.js';
import { getCurrentPosition, createLocationProof, formatCoordinates } from '../services/astralService.js';
import { findBioregionAtCoordinate } from '../services/bioregionService.js';
import { checkTgnBalance, TGN_INFO } from '../services/conservationService.js';
import { submitCapture } from '../services/agentApi.js';

function CaptureStep({ num, label, state, children }) {
  const colorMap = {
    verified: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    acquired: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    created: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    failed: 'bg-red-500/20 border-red-500/30 text-red-400',
    checking: 'bg-orange-500/20 border-orange-500/30 text-orange-400 animate-pulse',
    acquiring: 'bg-orange-500/20 border-orange-500/30 text-orange-400 animate-pulse',
    creating: 'bg-orange-500/20 border-orange-500/30 text-orange-400 animate-pulse',
    submitting: 'bg-orange-500/20 border-orange-500/30 text-orange-400 animate-pulse',
    pending: 'bg-[#111a14] border-[#1a2f1e] text-[#6b8f72]',
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${colorMap[state] || colorMap.pending}`}>
          {state === 'verified' || state === 'acquired' || state === 'created' || state === 'success' ? '✓' : num}
        </div>
        {num < 6 && <div className="w-px flex-1 bg-[#1a2f1e] mt-1 min-h-[16px]" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-[0.65rem] uppercase tracking-wider text-[#6b8f72] mb-1">{label}</div>
        {children}
      </div>
    </div>
  );
}

export default function CaptureFlow({ agent, walletAddress, onSuccess, onCancel, demoMode }) {
  const [step, setStep] = useState(0); // 0-5 (6 steps)
  const [states, setStates] = useState({
    type: 'pending', conservation: 'pending', gps: 'pending', bioregion: 'pending', proof: 'pending', submit: 'pending'
  });
  const [matchingCard, setMatchingCard] = useState(null);
  const [tgnBalance, setTgnBalance] = useState(null);
  const [location, setLocation] = useState(null);
  const [bioregionMatch, setBioregionMatch] = useState(null);
  const [proofData, setProofData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { executeStep(0); }, []);

  async function executeStep(stepNum) {
    setError(null);

    // Step 1: Type gate
    if (stepNum === 0) {
      setStates(s => ({ ...s, type: 'checking' }));
      try {
        const card = await getMatchingCard(walletAddress, agent.element);
        if (card) {
          setMatchingCard(card);
          setStates(s => ({ ...s, type: 'verified' }));
          setStep(1);
          setTimeout(() => executeStep(1), 500);
        } else {
          setStates(s => ({ ...s, type: 'failed' }));
          setError(`No ${agent.element}-type Beezie NFT found in your wallet.`);
        }
      } catch (e) {
        setStates(s => ({ ...s, type: 'failed' }));
        setError(e.message);
      }
    }

    // Step 2: Conservation gate ($TGN)
    if (stepNum === 1) {
      setStates(s => ({ ...s, conservation: 'checking' }));
      try {
        const result = await checkTgnBalance(walletAddress);
        if (result.holds) {
          setTgnBalance(result.balance);
          setStates(s => ({ ...s, conservation: 'verified' }));
          setStep(2);
          setTimeout(() => executeStep(2), 500);
        } else {
          setStates(s => ({ ...s, conservation: 'failed' }));
          setError('No $TGN found. Buy $TGN on Uniswap to fund tree planting.');
        }
      } catch (e) {
        setStates(s => ({ ...s, conservation: 'failed' }));
        setError(e.message);
      }
    }

    // Step 3: GPS
    if (stepNum === 2) {
      setStates(s => ({ ...s, gps: 'acquiring' }));
      try {
        let loc;
        if (demoMode) {
          loc = { latitude: agent.center[1], longitude: agent.center[0], accuracy: 10, timestamp: Date.now(), source: 'demo' };
        } else {
          loc = await getCurrentPosition();
        }
        setLocation(loc);
        setStates(s => ({ ...s, gps: 'acquired' }));
        setStep(3);
        setTimeout(() => executeStep(3), 500);
      } catch (e) {
        setStates(s => ({ ...s, gps: 'failed' }));
        setError('Location services denied. Enable in browser settings.');
      }
    }

    // Step 4: Bioregion verify
    if (stepNum === 3) {
      setStates(s => ({ ...s, bioregion: 'checking' }));
      try {
        if (demoMode) {
          setBioregionMatch({ name: agent.bioregionName, match: true });
          setStates(s => ({ ...s, bioregion: 'verified' }));
        } else {
          const feature = findBioregionAtCoordinate(location.longitude, location.latitude);
          const match = feature?.properties?.id === agent.bioregionId;
          setBioregionMatch({
            name: feature?.properties?.name || 'Unknown',
            match,
            targetName: agent.bioregionName
          });
          if (match) {
            setStates(s => ({ ...s, bioregion: 'verified' }));
          } else {
            setStates(s => ({ ...s, bioregion: 'failed' }));
            setError(`Not in ${agent.bioregionName}. You are in ${feature?.properties?.name || 'unknown bioregion'}.`);
            return;
          }
        }
        setStep(4);
        setTimeout(() => executeStep(4), 500);
      } catch (e) {
        setStates(s => ({ ...s, bioregion: 'failed' }));
        setError(e.message);
      }
    }

    // Step 5: Astral proof
    if (stepNum === 4) {
      setStates(s => ({ ...s, proof: 'creating' }));
      try {
        const proof = await createLocationProof(location, agent);
        setProofData(proof);
        setStates(s => ({ ...s, proof: 'created' }));
        setStep(5);
        setTimeout(() => executeStep(5), 500);
      } catch (e) {
        setStates(s => ({ ...s, proof: 'failed' }));
        setError(e.message);
      }
    }

    // Step 6: Submit
    if (stepNum === 5) {
      setStates(s => ({ ...s, submit: 'submitting' }));
      try {
        const result = await submitCapture(agent.id, {
          catcherWallet: walletAddress,
          matchingCardTokenId: matchingCard.tokenId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          astralProofHash: proofData.uid
        });
        setStates(s => ({ ...s, submit: 'success' }));
        setStep(6);
        setTimeout(() => onSuccess(result), 2000);
      } catch (e) {
        setStates(s => ({ ...s, submit: 'failed' }));
        setError(e.message);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0a0f0a] border border-[#1a2f1e] rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a2f1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#111a14] flex items-center justify-center">
              <span className="text-lg">{agent.pokemon?.[0] || '?'}</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#e0ece2]">CAPTURING: {agent.pokemon}</div>
              <div className="text-[0.65rem] text-[#6b8f72]">Step {Math.min(step + 1, 6)} of 6</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-[#6b8f72] hover:text-[#e0ece2] text-xl">✕</button>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-1">
          <CaptureStep num={1} label="Type Verification" state={states.type}>
            {states.type === 'checking' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Scanning wallet for {agent.element}-type Beezie NFT...</span>
              </div>
            )}
            {states.type === 'verified' && matchingCard && (
              <div className="text-emerald-400 text-sm font-medium">Found: {matchingCard.pokemon} (Token #{matchingCard.tokenId})</div>
            )}
            {states.type === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <a href="https://beezie.com/marketplace" target="_blank" rel="noreferrer" className="text-emerald-400 ml-2 hover:underline">Buy on Beezie</a>
              </div>
            )}
          </CaptureStep>

          <CaptureStep num={2} label="Conservation Action" state={states.conservation}>
            {states.conservation === 'checking' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Checking $TGN balance (Treegens)...</span>
              </div>
            )}
            {states.conservation === 'verified' && tgnBalance && (
              <div className="text-emerald-400 text-sm font-medium">
                Holding {parseFloat(tgnBalance).toFixed(2)} $TGN — funding mangrove planting 🌱
              </div>
            )}
            {states.conservation === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <a href={TGN_INFO.buyUrl} target="_blank" rel="noreferrer" className="text-emerald-400 ml-2 hover:underline">Buy $TGN on Uniswap</a>
              </div>
            )}
          </CaptureStep>

          <CaptureStep num={3} label="GPS Acquisition" state={states.gps}>
            {states.gps === 'acquiring' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">{demoMode ? 'Using agent location (demo)...' : 'Acquiring GPS...'}</span>
              </div>
            )}
            {states.gps === 'acquired' && location && (
              <div className="font-mono text-sm text-[#e0ece2]">
                {formatCoordinates(location.latitude, location.longitude)}
                <span className="text-[#6b8f72] ml-2">{'\u00B1'}{Math.round(location.accuracy)}m</span>
                <span className="text-emerald-400 ml-2">✓</span>
                {demoMode && <span className="text-amber-400 ml-2 text-xs">(demo)</span>}
              </div>
            )}
            {states.gps === 'failed' && <span className="text-red-400 text-sm">Location services denied. Enable in browser settings.</span>}
          </CaptureStep>

          <CaptureStep num={4} label="Bioregion Verification" state={states.bioregion}>
            {states.bioregion === 'checking' && <span className="text-[#6b8f72] text-sm">Checking: {agent.bioregionName}...</span>}
            {states.bioregion === 'verified' && <span className="text-emerald-400 text-sm font-medium">You are in {agent.bioregionName} {demoMode && '(demo)'}</span>}
            {states.bioregion === 'failed' && <span className="text-red-400 text-sm">{error}</span>}
          </CaptureStep>

          <CaptureStep num={5} label="Astral Proof" state={states.proof}>
            {states.proof === 'creating' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Generating location proof...</span>
              </div>
            )}
            {states.proof === 'created' && proofData && (
              <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3">
                <div className="text-[0.6rem] uppercase tracking-[0.08em] text-[#6b8f72] mb-1">
                  {proofData.simulated ? 'Simulated Proof' : 'EAS Attestation'}
                </div>
                <div className="font-mono text-sm text-[#e0ece2] truncate">{proofData.uid}</div>
                {proofData.txHash && (
                  <a href={`https://basescan.org/tx/${proofData.txHash}`} target="_blank" rel="noreferrer" className="text-[0.65rem] text-emerald-400 hover:underline">
                    View on BaseScan
                  </a>
                )}
              </div>
            )}
            {states.proof === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <button onClick={() => executeStep(5)} className="text-emerald-400 ml-2 hover:underline">Retry</button>
              </div>
            )}
          </CaptureStep>

          <CaptureStep num={6} label="Onchain Submission" state={states.submit}>
            {states.submit === 'submitting' && <span className="text-[#6b8f72] text-sm">Submitting capture...</span>}
            {states.submit === 'success' && (
              <div className="text-center py-4">
                <div className="text-3xl font-black text-[#e0ece2] animate-bounce">CAPTURED!</div>
                <div className="mt-2 text-[#6b8f72]">{agent.pokemon} is now yours.</div>
                <div className="mt-3"><StatusPill status="captured" /></div>
              </div>
            )}
            {states.submit === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <button onClick={() => executeStep(4)} className="text-emerald-400 ml-2 hover:underline">Retry</button>
              </div>
            )}
          </CaptureStep>
        </div>
      </div>
    </div>
  );
}
