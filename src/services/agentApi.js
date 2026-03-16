const API_BASE = import.meta.env.DEV ? '' : ''; // Vite proxy handles /api in dev

export async function getAgents() {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}

export async function getAgentStatus(id) {
  const res = await fetch(`/api/agents/${id}/status`);
  if (!res.ok) throw new Error(`Failed to fetch agent ${id}: ${res.status}`);
  return res.json();
}

export async function getAgentHeartbeats(id, limit = 50) {
  const res = await fetch(`/api/agents/${id}/heartbeats?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch heartbeats: ${res.status}`);
  return res.json();
}

export async function submitCapture(agentId, proof) {
  const res = await fetch('/api/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, ...proof })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Capture failed' }));
    throw new Error(err.error || `Capture failed: ${res.status}`);
  }
  return res.json();
}
