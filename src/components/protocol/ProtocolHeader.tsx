'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Settings,
  LogOut,
  Wallet,
  Menu,
  Search,
  MessageCircle,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSidebar } from '@/context/SidebarContext';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

interface ProtocolHeaderProps {
  currentRoute: 'home' | 'jackpot' | 'coinflip' | 'mines' | 'cups' | 'account' | 'docs';
  onOpenDispatch?: () => void;
  dispatchCount?: number;
  onOpenWalletModal?: () => void;
  onToggleSidebar?: () => void;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({
  currentRoute,
  onOpenDispatch,
  dispatchCount = 0,
  onOpenWalletModal,
  onToggleSidebar,
}) => {
  const {
    account,
    isConnected,
    usdgBalance,
    disconnectWallet,
  } = useCashFlipWeb3();

  const { toggleCollapsed, toggleMobileOpen } = useSidebar();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fortis_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name || parsed.avatar) {
          setUserProfile({ name: parsed.name || '', avatar: parsed.avatar || '' });
        }
      }
    } catch (e) {}
  }, [account]);

  const displayName = userProfile.name || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Player');
  const displayAvatar = (userProfile.avatar && userProfile.avatar !== '/image/logo.png' && !userProfile.avatar.includes('broken')) 
    ? userProfile.avatar 
    : '/favicon.png?v=fixed';

  const handleMobileMenu = () => {
    if (onToggleSidebar) onToggleSidebar();
    else toggleMobileOpen();
  };

  const handleDesktopToggle = () => {
    if (onToggleSidebar) onToggleSidebar();
    else toggleCollapsed();
  };

  return (
    <header className="stake-topbar w-full px-4 flex items-center justify-between gap-3 select-none bg-[#0F212E] border-b border-[#213743]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={handleMobileMenu}
          className="w-9 h-9 flex items-center justify-center rounded-md text-[#B1BAD3] hover:text-white hover:bg-[#213743] transition-colors lg:hidden shrink-0"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          onClick={handleDesktopToggle}
          className="hidden lg:flex w-9 h-9 items-center justify-center rounded-md text-[#B1BAD3] hover:text-white hover:bg-[#213743] transition-colors shrink-0"
          aria-label="Toggle sidebar width"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo in header for small screens if needed */}
        <Link href="/" className="flex items-center gap-2 lg:hidden shrink-0">
          <img src="/image/logo.png" alt="FORTIS" className="w-7 h-7 object-contain" />
          <span className="font-extrabold text-white text-sm">FORTIS</span>
        </Link>

        {/* Search bar */}
        <div className="hidden sm:flex items-center gap-2 bg-[#071824] border border-[#213743] rounded-md px-3 py-1.5 text-sm text-[#557086] w-64 md:w-80">
          <Search className="w-4 h-4 shrink-0" />
          <input
            type="text"
            placeholder="Search Originals, games..."
            className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-[#557086]"
          />
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live Chat / Dispatch Drawer */}
        <button
          onClick={onOpenDispatch}
          className="relative w-9 h-9 flex items-center justify-center rounded-md text-[#B1BAD3] hover:text-white hover:bg-[#213743] transition-colors"
          title="Open Community Live Chat"
        >
          <MessageCircle className="w-5 h-5" />
          {dispatchCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#00E701] text-[#071824] text-[9px] font-bold rounded-full flex items-center justify-center">
              {dispatchCount > 99 ? '99+' : dispatchCount}
            </span>
          )}
        </button>

        {/* Wallet Area */}
        {isConnected && account ? (
          <div className="relative">
            <button
              onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              className="flex items-center gap-2 bg-[#1A2C38] hover:bg-[#213743] border border-[#213743] hover:border-[#2A4658] rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-[#071824] border border-[#213743] shrink-0 flex items-center justify-center">
                <img
                  src={displayAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/favicon.ico')) {
                      target.src = '/favicon.ico';
                    }
                  }}
                />
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-white font-bold text-xs font-mono">
                  {usdgBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  <span className="text-[#00E701] font-semibold ml-1">{TOKEN_SYMBOL}</span>
                </span>
                <span className="text-[#557086] font-mono text-[10px]">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-[#B1BAD3] transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showWalletDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowWalletDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[#0F212E] border border-[#213743] shadow-2xl z-40 py-1 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-[#213743]">
                      <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                      <p className="font-mono text-[11px] text-[#557086] truncate mt-0.5">{account}</p>
                      <p className="font-mono text-sm font-bold text-[#00E701] mt-1.5">
                        {usdgBalance.toFixed(2)} <span className="text-[#B1BAD3] font-normal text-xs">{TOKEN_SYMBOL}</span>
                      </p>
                    </div>

                    <Link
                      href="/account"
                      onClick={() => setShowWalletDropdown(false)}
                      className="w-full px-4 py-2.5 text-[#B1BAD3] text-sm flex items-center gap-2.5 hover:bg-[#213743] hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Account Settings</span>
                    </Link>

                    <button
                      onClick={() => { setShowWalletDropdown(false); disconnectWallet(); }}
                      className="w-full px-4 py-2.5 text-red-400 text-sm flex items-center gap-2.5 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-2 bg-[#00E701] hover:bg-[#00C800] text-[#071824] font-bold text-xs sm:text-sm rounded-md px-3.5 sm:px-4 py-2 transition-transform active:scale-95 shadow-md"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
      </div>
    </header>
  );
};
