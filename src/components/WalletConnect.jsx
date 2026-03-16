import { useState } from 'react';

export default function WalletConnect({ walletAddress, onWalletChange }) {
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    if (!window.ethereum) {
      alert('No wallet detected. Install MetaMask or similar.');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) onWalletChange(accounts[0]);
    } catch (e) {
      console.error('Wallet connect failed:', e);
    }
    setConnecting(false);
  }

  if (walletAddress) {
    return (
      <button
        onClick={() => onWalletChange(null)}
        className="text-xs font-mono text-[#e0ece2] bg-[#111a14] border border-[#1a2f1e] px-2 py-1 rounded hover:border-emerald-500/30 transition-colors"
      >
        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="text-xs font-medium text-[#e0ece2] bg-[#111a14] border border-[#1a2f1e] px-3 py-1 rounded hover:border-emerald-500/30 transition-colors disabled:opacity-50"
    >
      {connecting ? 'Connecting...' : 'Connect'}
    </button>
  );
}
