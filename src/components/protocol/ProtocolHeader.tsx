'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Volume2,
  VolumeX,
  ChevronDown,
  Terminal,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSound } from '@/context/SoundContext';
import { ROBINHOOD_CHAIN_CONFIG, getCashFlipTokenAddress, TOKEN_SYMBOL } from '@/lib/web3/contracts';

interface ProtocolHeaderProps {
  currentRoute: 'home' | 'jackpot' | 'coinflip' | 'mines' | 'account' | 'docs';
  onOpenDispatch?: () => void;
  dispatchCount?: number;
  onOpenWalletModal?: () => void;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({
  currentRoute,
  onOpenDispatch,
  dispatchCount = 0,
  onOpenWalletModal,
}) => {
  const {
    account,
    isConnected,
    usdgBalance,
    disconnectWallet,
  } = useCashFlipWeb3();

  const { soundEnabled, toggleSound } = useSound();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  useEffect(() => {
    try {
      setTokenAddress(getCashFlipTokenAddress());
      const saved = localStorage.getItem('kofuku_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name || parsed.avatar) {
          setUserProfile({
            name: parsed.name || '',
            avatar: parsed.avatar || '',
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }, [account]);

  const displayName = userProfile.name || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Initiate');
  const displayAvatar = userProfile.avatar || '/image/logo.png';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.04] bg-[#030508]/80 backdrop-blur-xl px-4 sm:px-8 py-4 flex items-center justify-between transition-colors">
      {/* Left: KOFUKU & ROBINHOOD CHAIN */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 p-1 flex items-center justify-center group-hover:border-[#CDB486]/50 transition-colors shadow-sm">
            <img src="/image/logo.png" alt="KOFUKU" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-base font-extrabold tracking-tight text-[#F5F0E6] group-hover:text-[#CDB486] transition-colors leading-none">
              KOFUKU
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#8993A4] mt-0.5">
              ROBINHOOD CHAIN
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Navigation Links (Liquid Glass Pills) */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-sans font-bold tracking-wider">
        <Link
          href="/jackpot"
          className={currentRoute === 'jackpot' ? 'glass-pill-active' : 'glass-pill-inactive'}
        >
          JACKPOT
        </Link>
        <Link
          href="/coinflip"
          className={currentRoute === 'coinflip' ? 'glass-pill-active' : 'glass-pill-inactive'}
        >
          COINFLIP
        </Link>
        <Link
          href="/mines"
          className={currentRoute === 'mines' ? 'glass-pill-active' : 'glass-pill-inactive'}
        >
          MINES
        </Link>
      </nav>

      {/* Right: Twitter Link, Wallet Balance, Address, Connect */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Twitter / X Link */}
        <a
          href="https://x.com/kofukudotio"
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 rounded-full glass-capsule flex items-center justify-center text-[#E8DFCF] hover:text-[#CDB486] hover:border-[#CDB486]/50 transition-all duration-300 shadow-sm group"
          title="Follow @kofukudotio on X"
          aria-label="Twitter / X (@kofukudotio)"
        >
          <svg
            className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110"
            viewBox="0 0 24 24"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {isConnected && account ? (
          <div className="relative">
            <button
              onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              className="glass-wallet-capsule flex items-center gap-2.5 px-4 py-1.5 text-sm cursor-pointer"
            >
              <div className="text-right font-sans leading-tight hidden sm:block">
                <span className="font-mono text-xs font-bold text-[#F5F0E6] block">
                  {usdgBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {TOKEN_SYMBOL}
                </span>
                <span className="font-mono text-[10px] text-[#8993A4]">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 border border-white/20 flex-shrink-0 shadow-inner">
                <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#8993A4] transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showWalletDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowWalletDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0a0d14]/95 border border-white/10 shadow-2xl z-40 p-3 space-y-2 text-sm font-sans backdrop-blur-xl"
                  >
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="font-semibold text-[#F5F0E6] truncate">{displayName}</p>
                      <p className="font-mono text-[11px] text-[#8993A4] truncate">{account}</p>
                      <p className="font-mono text-xs font-bold text-[#CDB486] mt-1">
                        {usdgBalance.toFixed(2)} {TOKEN_SYMBOL}
                      </p>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setShowWalletDropdown(false)}
                      className="w-full py-2 px-3 rounded-xl hover:bg-white/5 text-[#F5F7FA] text-xs flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#8993A4]" />
                      <span>Account Settings</span>
                    </Link>

                    <button
                      onClick={() => {
                        setShowWalletDropdown(false);
                        disconnectWallet();
                      }}
                      className="w-full py-2 px-3 rounded-xl hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={onOpenWalletModal}
            className="glass-btn-inflated px-5 py-2 text-xs flex items-center gap-2 shadow-lg"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>CONNECT WALLET</span>
          </button>
        )}
      </div>
    </header>
  );
};
