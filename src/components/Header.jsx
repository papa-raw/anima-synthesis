import WalletConnect from './WalletConnect.jsx';

export default function Header({ walletAddress, onWalletChange }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 bg-[#0a0f0a]/80 backdrop-blur-sm border-b border-[#1a2f1e]">
      <div className="text-sm font-bold tracking-widest text-emerald-400">ANIMA</div>
      <div className="flex items-center gap-2">
        <span className="text-[0.6rem] uppercase tracking-wider text-[#6b8f72] bg-[#111a14] border border-[#1a2f1e] px-2 py-0.5 rounded">Base</span>
        <WalletConnect walletAddress={walletAddress} onWalletChange={onWalletChange} />
      </div>
    </div>
  );
}
