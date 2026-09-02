'use client';

import React, { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, ChevronDown, Gift, Copy, Check, ArrowDownToLine, Shield } from 'lucide-react';

export const PrivyAuthButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { user, authenticated, ready, login, logout, isDemoMode, updateChips, openPayoutModal } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return (
      <div className="w-24 h-8 bg-[#0d1627] rounded-xl animate-pulse border border-cyan-500/15" />
    );
  }

  if (!authenticated || !user) {
    return (
      <button
        onClick={login}
        className="tactile-btn flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-black rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>CONNECT WALLET</span>
      </button>
    );
  }

  const handleCopy = () => {
    if (user.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFaucet = () => {
    updateChips(user.chips + 10000);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="tactile-btn flex items-center gap-2 px-3 py-1.5 bg-[#0a1120]/80 backdrop-blur-xl border border-cyan-500/25 hover:border-cyan-400/60 rounded-xl transition-all shadow-sm"
      >
        <img
          src={user.avatar}
          alt=""
          className="w-6 h-6 rounded-lg border border-cyan-400/40 object-cover"
        />
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-black px-1.5 py-0.2 bg-cyan-950/60 border border-cyan-500/30 text-[#00f0ff] rounded">
              {user.walletType.toUpperCase()}
            </span>
            <p className="text-xs font-bold text-white leading-none">{user.name}</p>
          </div>
          <p className="text-[10px] text-emerald-400 font-mono font-bold leading-none mt-0.5">
            {user.chips.toLocaleString()} <span className="text-slate-500 font-normal">pts</span>
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 transition-transform hidden sm:block ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-64 bg-[#080d1a]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-cyan-500/15">
              <div className="flex items-center gap-2.5 mb-2.5">
                <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl border border-cyan-400/40 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Robinhood Chain L2
                  </span>
                </div>
              </div>

              {user.walletAddress && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 w-full text-left px-2.5 py-1.5 bg-[#050812] rounded-xl hover:bg-[#070d1e] transition-colors group border border-cyan-500/15"
                >
                  <span className="font-mono text-[10px] text-slate-300 flex-1 truncate">
                    {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-8)}
                  </span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white flex-shrink-0" />
                  )}
                </button>
              )}

              <div className="mt-2.5 p-2.5 bg-[#0b1324]/80 rounded-xl border border-cyan-500/20">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Available Liquidity:</p>
                <div className="flex items-baseline justify-between mt-0.5">
                  <p className="text-xl font-black text-emerald-400 font-mono">{user.chips.toLocaleString()}</p>
                  <span className="text-xs text-cyan-300 font-mono">~{(user.chips / 1000).toFixed(3)} ETH</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  openPayoutModal();
                }}
                className="tactile-btn flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/15 hover:from-cyan-500/30 hover:to-teal-500/25 text-xs font-black text-[#00f0ff] transition-all border border-cyan-500/30"
              >
                <ArrowDownToLine className="w-4 h-4 text-[#00f0ff]" />
                <span>Withdraw Payout</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowDropdown(false);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-rose-950/30 text-xs text-rose-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}
    </div>
  );
};
