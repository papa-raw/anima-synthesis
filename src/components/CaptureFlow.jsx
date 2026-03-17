import { useState, useEffect, useRef } from 'react';
import StatusPill from './StatusPill.jsx';
import { getMatchingCard } from '../services/beezieService.js';
import { getCurrentPosition, createLocationProof, formatCoordinates } from '../services/astralService.js';
import { findBioregionAtCoordinate } from '../services/bioregionService.js';
import { checkAzusdBalance, AZUSD_INFO } from '../services/conservationService.js';
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
        {num < 3 && <div className="w-px flex-1 bg-[#1a2f1e] mt-1 min-h-[16px]" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-[0.65rem] uppercase tracking-wider text-[#6b8f72] mb-1">{label}</div>
        {children}
      </div>
    </div>
  );
}

export default function CaptureFlow({ agent, walletAddress, onSuccess, onCancel, demoMode }) {
  // Demo mode only bypasses wallet checks (NFT + AZUSD). GPS, bioregion, and Astral proofs are ALWAYS real.
  const demoWallet = demoMode; // bypass NFT + AZUSD checks
  const demoLocation = false;  // NEVER fake GPS — we want real proofs
  const [step, setStep] = useState(0); // 0-3 (4 steps)
  const [states, setStates] = useState({
    conservation: 'pending', gps: 'pending', bioregion: 'pending', proof: 'pending'
  });
  const [tgnBalance, setTgnBalance] = useState(null);
  const [location, _setLocation] = useState(null);
  const locationRef = useRef(null);
  const setLocation = (loc) => { locationRef.current = loc; _setLocation(loc); };
  const [bioregionMatch, setBioregionMatch] = useState(null);
  const [proofData, _setProofData] = useState(null);
  const proofDataRef = useRef(null);
  const setProofData = (p) => { proofDataRef.current = p; _setProofData(p); };
  const [error, setError] = useState(null);

  useEffect(() => { executeStep(0); }, []);

  async function executeStep(stepNum) {
    setError(null);

    // Step 1: Conservation gate (AZUSD)
    if (stepNum === 0) {
      setStates(s => ({ ...s, conservation: 'checking' }));
      if (demoWallet) {
        setTgnBalance('100.00');
        setStates(s => ({ ...s, conservation: 'verified' }));
        setStep(1);
        setTimeout(() => executeStep(1), 500);
        return;
      }
      try {
        const result = await checkAzusdBalance(walletAddress);
        if (result.holds) {
          setTgnBalance(result.balance);
          setStates(s => ({ ...s, conservation: 'verified' }));
          setStep(1);
          setTimeout(() => executeStep(1), 500);
        } else {
          setStates(s => ({ ...s, conservation: 'failed' }));
          setError(`Need ≥${AZUSD_INFO.required} AZUSD. Mint at app.azos.finance`);
        }
      } catch (e) {
        setStates(s => ({ ...s, conservation: 'failed' }));
        setError(e.message);
      }
    }

    // Step 2: GPS + Bioregion (combined — get location, verify bioregion)
    if (stepNum === 1) {
      setStates(s => ({ ...s, gps: 'acquiring' }));
      try {
        let loc;
        if (demoLocation) {
          loc = { latitude: agent.center[1], longitude: agent.center[0], accuracy: 10, timestamp: Date.now(), source: 'demo' };
        } else {
          loc = await getCurrentPosition();
        }
        setLocation(loc);
        setStates(s => ({ ...s, gps: 'acquired' }));

        // Immediately verify bioregion
        setStates(s => ({ ...s, bioregion: 'checking' }));
        const { loadBioregionBoundaries, areBoundariesLoaded } = await import('../services/bioregionService.js');
        if (!areBoundariesLoaded()) await loadBioregionBoundaries();

        if (!demoLocation) {
          const feature = findBioregionAtCoordinate(locationRef.current.longitude, locationRef.current.latitude);
          const featureId = feature?.properties?.Bioregions || feature?.properties?.id || null;
          const match = featureId === agent.bioregionId;

          if (!match) {
            setStates(s => ({ ...s, bioregion: 'failed' }));
            setError(`Not in ${agent.bioregionName}. You are in ${featureId || 'unknown bioregion'}.`);
            return;
          }
        }
        setBioregionMatch({ name: agent.bioregionName, match: true });
        setStates(s => ({ ...s, bioregion: 'verified' }));
        setStep(2);
        setTimeout(() => executeStep(2), 500);
      } catch (e) {
        setStates(s => ({ ...s, gps: 'failed' }));
        setError(e.message);
      }
    }

    // Step 3: Astral proof + Submit
    if (stepNum === 2) {
      setStates(s => ({ ...s, proof: 'creating' }));
      try {
        const proof = await createLocationProof(locationRef.current, agent);
        setProofData(proof);
        setStates(s => ({ ...s, proof: 'created' }));

        // Submit capture
        const result = await submitCapture(agent.id, {
          catcherWallet: walletAddress,
          matchingCardTokenId: 'none',
          latitude: locationRef.current.latitude,
          longitude: locationRef.current.longitude,
          accuracy: locationRef.current.accuracy,
          astralProofHash: proofDataRef.current?.uid || ''
        });
        setStep(3);
        setTimeout(() => onSuccess(result), 2000);
      } catch (e) {
        setStates(s => ({ ...s, proof: 'failed' }));
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
              <div className="text-[0.65rem] text-[#6b8f72]">Step {Math.min(step + 1, 3)} of 3</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-[#6b8f72] hover:text-[#e0ece2] text-xl">✕</button>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-1">
          <CaptureStep num={1} label="Conservation Action" state={states.conservation}>
            {states.conservation === 'checking' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Checking AZUSD balance...</span>
              </div>
            )}
            {states.conservation === 'verified' && tgnBalance && (
              <div className="text-emerald-400 text-sm font-medium">
                Holding {parseFloat(tgnBalance).toFixed(2)} AZUSD — stable collateral verified
              </div>
            )}
            {states.conservation === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <a href={AZUSD_INFO.mintUrl} target="_blank" rel="noreferrer" className="text-emerald-400 ml-2 hover:underline">Mint AZUSD</a>
              </div>
            )}
          </CaptureStep>

          <CaptureStep num={2} label="Location Proof" state={states.gps === 'acquired' && states.bioregion === 'verified' ? 'verified' : states.gps === 'failed' || states.bioregion === 'failed' ? 'failed' : states.gps !== 'pending' ? 'checking' : 'pending'}>
            {states.gps === 'acquiring' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Acquiring GPS...</span>
              </div>
            )}
            {states.gps === 'acquired' && states.bioregion === 'checking' && (
              <div>
                <div className="font-mono text-sm text-[#e0ece2]">
                  {formatCoordinates(location.latitude, location.longitude)}
                  <span className="text-[#6b8f72] ml-2">{'\u00B1'}{Math.round(location.accuracy)}m</span>
                  <span className="text-emerald-400 ml-2">✓</span>
                </div>
                <span className="text-[#6b8f72] text-sm">Verifying bioregion...</span>
              </div>
            )}
            {states.bioregion === 'verified' && location && (
              <div>
                <div className="font-mono text-sm text-[#e0ece2]">
                  {formatCoordinates(location.latitude, location.longitude)}
                  <span className="text-[#6b8f72] ml-2">{'\u00B1'}{Math.round(location.accuracy)}m</span>
                  <span className="text-emerald-400 ml-2">✓</span>
                </div>
                <div className="text-emerald-400 text-sm font-medium mt-1">Confirmed: {agent.bioregionName}</div>
              </div>
            )}
            {(states.gps === 'failed' || states.bioregion === 'failed') && <span className="text-red-400 text-sm">{error}</span>}
          </CaptureStep>

          <CaptureStep num={3} label="Astral Capture" state={states.proof === 'created' ? 'success' : states.proof}>
            {states.proof === 'creating' && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                <span className="text-[#6b8f72] text-sm">Creating Astral proof & capturing...</span>
              </div>
            )}
            {states.proof === 'created' && (
              <div>
                {proofData && (
                  <div className="bg-[#111a14] border border-[#1a2f1e] rounded-lg p-3 mb-3">
                    <div className="text-[0.6rem] uppercase tracking-[0.08em] text-[#6b8f72] mb-1">
                      {proofData.simulated ? 'Location Proof' : 'EAS Attestation'}
                    </div>
                    <div className="font-mono text-sm text-[#e0ece2] truncate">{proofData.uid}</div>
                    {proofData.txHash && (
                      <a href={`https://basescan.org/tx/${proofData.txHash}`} target="_blank" rel="noreferrer" className="text-[0.65rem] text-emerald-400 hover:underline">
                        View on BaseScan
                      </a>
                    )}
                  </div>
                )}
                <div className="text-center py-4">
                  <div className="text-3xl font-black text-[#e0ece2] animate-bounce">CAPTURED!</div>
                  <div className="mt-2 text-[#6b8f72]">{agent.pokemon} is now yours.</div>
                  <div className="mt-3"><StatusPill status="captured" /></div>
                </div>
              </div>
            )}
            {states.proof === 'failed' && (
              <div className="text-sm">
                <span className="text-red-400">{error}</span>
                <button onClick={() => executeStep(2)} className="text-emerald-400 ml-2 hover:underline">Retry</button>
              </div>
            )}
          </CaptureStep>
        </div>
      </div>
    </div>
  );
}
