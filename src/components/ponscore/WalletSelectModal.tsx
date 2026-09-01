'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';

interface WalletSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'okx' | 'metamask' | 'rabby' | 'bitget') => void;
}

export const WalletSelectModal: React.FC<WalletSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  if (!isOpen) return null;

  const win = typeof window !== 'undefined' ? (window as any) : {};

  const wallets = [
    {
      id: 'okx' as const,
      name: 'OKX Wallet',
      subtitle: 'Multi-Chain & Robinhood Ready',
      isInstalled: !!win.okxwallet,
      icon: '🛡️',
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-cyan-500/30',
      downloadUrl: 'https://www.okx.com/web3',
    },
    {
      id: 'metamask' as const,
      name: 'MetaMask',
      subtitle: 'Popular EVM Web3 Wallet',
      isInstalled: !!win.ethereum?.isMetaMask,
      icon: '🦊',
      color: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-500/30',
      downloadUrl: 'https://metamask.io/download/',
    },
    {
      id: 'rabby' as const,
      name: 'Rabby Wallet',
      subtitle: 'Optimized for DeFi & EVM',
      isInstalled: !!win.rabby,
      icon: '🐰',
      color: 'from-indigo-500/20 to-purple-500/20',
      border: 'border-indigo-500/30',
      downloadUrl: 'https://rabby.io/',
    },
    {
      id: 'bitget' as const,
      name: 'Bitget Wallet',
      subtitle: 'Web3 Trading Wallet',
      isInstalled: !!win.bitkeep?.ethereum,
      icon: '💎',
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      downloadUrl: 'https://web3.bitget.com/',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-md bg-[#060b17]/98 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] space-y-5 text-white font-sans overflow-hidden z-10 backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-orbitron text-neon-cyan">SELECT WEB3 WALLET</h3>
                <p className="text-[11px] text-slate-400 font-mono">ROBINHOOD CHAIN L2 (CHAIN ID: 4663)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Wallets List */}
          <div className="space-y-2.5">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => {
                  onSelect(wallet.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#091224] hover:bg-[#0f1d38] border border-cyan-500/20 hover:border-cyan-400/60 transition-all text-left group shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl bg-black/60 border ${wallet.border} flex items-center justify-center text-xl shadow-inner flex-shrink-0`}>
                    {wallet.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors font-cyber">
                        {wallet.name}
                      </span>
                      {wallet.isInstalled && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[#00ff88] text-[9px] font-mono font-bold border border-emerald-500/30">
                          INSTALLED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">{wallet.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#00f0ff] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                    CONNECT
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#00f0ff] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {/* Footer Security Notice */}
          <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-[#00ff88] flex-shrink-0" />
            <span>Non-custodial connection. Keys remain safely in your browser.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
