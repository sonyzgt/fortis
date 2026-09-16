'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const win = typeof window !== 'undefined' ? (window as any) : {};

  const wallets = [
    {
      id: 'okx' as const,
      name: 'OKX Wallet',
      subtitle: 'Native Robinhood Chain & Multi-Chain Support',
      isInstalled: !!win.okxwallet,
      symbol: '⬡',
    },
    {
      id: 'metamask' as const,
      name: 'MetaMask',
      subtitle: 'Universal EVM Web3 Portal',
      isInstalled: !!win.ethereum?.isMetaMask,
      symbol: '✦',
    },
    {
      id: 'rabby' as const,
      name: 'Rabby Wallet',
      subtitle: 'Optimized GameFi & DeFi Navigator',
      isInstalled: !!win.rabby,
      symbol: '☽',
    },
    {
      id: 'bitget' as const,
      name: 'Bitget Wallet',
      subtitle: 'Web3 Gateway & Asset Ledger',
      isInstalled: !!win.bitkeep?.ethereum,
      symbol: '❖',
    },
  ];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#030508]/85 backdrop-blur-xl cursor-pointer"
          onClick={onClose}
        />

        {/* Liquid Glass Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md glass-capsule rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.1)] space-y-5 text-[#F5F7FA] font-sans z-10 select-none border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E701]/10 border border-[#00E701]/25 flex items-center justify-center flex-shrink-0 text-[#00E701] shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold tracking-wide uppercase text-[#F5F7FA]">
                  CONNECT WALLET
                </h3>
                <p className="text-xs text-[#8993A4] font-mono">
                  ROBINHOOD CHAIN 4663
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Close"
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
                className="w-full flex items-center justify-between p-3.5 glass-capsule rounded-2xl hover:border-[#00E701]/40 hover:bg-[#00E701]/[0.05] transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-sm font-mono text-[#00E701] flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    {wallet.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F5F7FA] group-hover:text-[#00E701] transition-colors">
                        {wallet.name}
                      </span>
                      {wallet.isInstalled && (
                        <span className="glass-pill-active text-[9px] font-mono tracking-wider uppercase font-bold px-2 py-0.5">
                          DETECTED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8993A4] mt-0.5">
                      {wallet.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-[#00E701]/40 group-hover:bg-[#00E701]/10 transition-all flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-[#8993A4] group-hover:text-[#00E701] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-[#8993A4]">
            <ShieldCheck className="w-4 h-4 text-[#00E701] flex-shrink-0" />
            <span className="leading-snug">Non-custodial connection. Private keys remain exclusively secure in your local wallet.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
