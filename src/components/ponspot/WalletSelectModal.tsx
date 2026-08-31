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
          className="relative w-full max-w-md bg-[#0c1611] border-2 border-[#718D76]/40 rounded-3xl p-6 shadow-2xl space-y-5 text-white font-sans overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Connect Web3 Wallet</h3>
                <p className="text-[11px] text-slate-400 font-mono">Robinhood Chain (L2 Arbitrum)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#13241c] hover:bg-[#1a3227] border border-[#718D76]/30 hover:border-emerald-400 transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${wallet.color} border ${wallet.border} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                    {wallet.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {wallet.name}
                      </span>
                      {wallet.isInstalled && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{wallet.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Connect
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {/* Security Assurance */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Non-custodial & secure. We will never ask for your private key.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
