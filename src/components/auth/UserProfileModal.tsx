'use client';

import React, { useState } from 'react';
import { useAuthUser } from './PrivyProviderWrapper';
import { X, Copy, Check, LogOut, Coins, PlusCircle, ShieldCheck } from 'lucide-react';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { user, logout, updateChips, isDemoMode } = useAuthUser();
  const [copied, setCopied] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  if (!user) return null;

  const handleCopy = () => {
    if (user.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaimFaucet = (amount: number) => {
    updateChips(user.chips + amount);
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow Header effect */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header / Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500/50 shadow-inner"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              {isDemoMode && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {(user as any).email || 'Robinhood Chain Player'}
            </p>
          </div>
        </div>

        {/* Wallet Address Box */}
        {user.walletAddress && (
          <div className="mb-5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
            <div className="overflow-hidden">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Wallet Address</p>
              <p className="text-xs font-mono text-emerald-400 truncate">{user.walletAddress}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              title="Copy Address"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Balance Card */}
        <div className="mb-6 p-4 bg-gradient-to-br from-emerald-950/40 to-slate-950/80 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" /> Total Chip Balance
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono">
              ${user.chips.toLocaleString()}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400 mb-2">Refill Chip Balance (Free Faucet):</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleClaimFaucet(5000)}
                className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-emerald-600/80 text-emerald-300 hover:text-white text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> +$5,000
              </button>
              <button
                onClick={() => handleClaimFaucet(25000)}
                className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-emerald-600/80 text-emerald-300 hover:text-white text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> +$25,000
              </button>
            </div>
            {faucetSuccess && (
              <p className="text-[11px] text-emerald-400 font-medium text-center mt-2 animate-bounce">
                🎉 Chips successfully added to your account!
              </p>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-300/80 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Secure encrypted authentication powered by Privy Auth Protocol.</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/40 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect / Logout</span>
        </button>
      </div>
    </div>
  );
};
