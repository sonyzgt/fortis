'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';
import { BookplateCorner } from '@/components/ui/CelestialFlourish';

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#121110]/80 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-md bg-[#F4EFE6] dark:bg-[#1A1816] border border-[#171513] dark:border-[#E8DFD1]/30 p-6 shadow-2xl space-y-5 text-[#171513] dark:text-[#E8DFD1] font-serif overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ornamental Bookplate Corners */}
          <BookplateCorner position="tl" />
          <BookplateCorner position="tr" />
          <BookplateCorner position="bl" />
          <BookplateCorner position="br" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 border border-brass/50 bg-[#E8DFD1] p-0.5 flex items-center justify-center flex-shrink-0">
                <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold tracking-[0.16em] uppercase">
                  CONNECT SANCTUARY
                </h3>
                <p className="text-[11px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
                  Cryptographic Repository · Robinhood Chain
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#625B51] hover:text-[#171513] dark:text-[#9E968B] dark:hover:text-[#E8DFD1] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Wallets List */}
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => {
                  onSelect(wallet.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-white/60 dark:bg-black/20 border border-[#171513]/15 dark:border-[#E8DFD1]/15 hover:border-brass dark:hover:border-brass hover:bg-[#EFE7DC] dark:hover:bg-[#221F1B] transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-[#171513]/25 dark:border-[#E8DFD1]/20 flex items-center justify-center text-sm font-serif text-brass flex-shrink-0">
                    {wallet.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-bold text-[#171513] dark:text-[#E8DFD1] group-hover:text-brass-dark dark:group-hover:text-brass-light transition-colors">
                        {wallet.name}
                      </span>
                      {wallet.isInstalled && (
                        <span className="px-1.5 py-0.2 border border-brass text-brass text-[8px] font-mono tracking-widest uppercase">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
                      {wallet.subtitle}
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-[#625B51] group-hover:text-brass group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Security Guarantee */}
          <div className="flex items-center gap-2.5 p-3 border border-[#171513]/10 dark:border-[#E8DFD1]/10 bg-[#E8DFD1]/40 dark:bg-[#141311]/40 text-[11px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
            <ShieldCheck className="w-4 h-4 text-brass flex-shrink-0" />
            <span>Non-custodial handshakes. Private keys never leave your sanctuary client.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
