'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { CoinFlipArena } from '@/components/jackpot/CoinFlipArena';
import { LiveDispatchDrawer } from '@/components/jackpot/LiveDispatchDrawer';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { ExternalLink } from 'lucide-react';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';

export default function CoinflipPage() {
  const { socket } = useSocket();
  const {
    account,
    isConnected,
    usdgBalance,
    connectWallet,
  } = useCashFlipWeb3();

  // Live Dispatch Drawer State
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Modals state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Profile state
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<{
    ok: boolean;
    title: string;
    desc: string;
    txHash?: string;
  } | null>(null);

  // Load user profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fortis_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) {
        setUserProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  }, []);

  const handleSaveProfile = useCallback((name: string, avatar: string) => {
    const finalAvatar = avatar || '/image/logo.png';
    const updated = { name, avatar: finalAvatar };
    setUserProfile(updated);
    try {
      localStorage.setItem('fortis_user_profile', JSON.stringify(updated));
      localStorage.setItem('fortis_profile_configured', 'true');
    } catch (e) {
      console.error('Failed to save profile', e);
    }
    setToastMsg({
      ok: true,
      title: 'RECORD UPDATED',
      desc: `Identifier: "${name}" registered in facility logs.`,
    });
  }, []);

  // Dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Chat message listener
  useEffect(() => {
    if (!socket) return;
    socket.on('chat_message', (msg: any) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });
    socket.on('chat_history', (history: any[]) => {
      if (Array.isArray(history)) setMessages(history);
    });
    return () => {
      socket.off('chat_message');
      socket.off('chat_history');
    };
  }, [socket]);

  const handleChat = useCallback(
    (text: string) => {
      const clean = text?.trim();
      if (!clean || !socket) return;
      const senderId = account || 'guest_observer';
      const senderName = userProfile.name?.trim() || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Operator');
      const senderAvatar = userProfile.avatar || '/image/logo.png';
      socket.emit('send_chat', {
        senderId,
        senderName,
        senderAvatar,
        text: clean,
      });
    },
    [socket, account, userProfile]
  );

  return (
    <div className="min-h-screen bg-[#071824] text-white font-sans selection:bg-[#00E701] selection:text-[#071824] flex flex-col relative overflow-x-hidden">
      {/* Ambient Liquid Glass Atmospheric Bubbles Background */}
      <AmbientLiquidBackground />

      {/* Header */}
      <ProtocolHeader
        currentRoute="coinflip"
        onOpenDispatch={() => setIsDispatchOpen(true)}
        dispatchCount={messages.length}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 relative z-10">
        {/* Section Title & Navigation Chamber Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#00E701] uppercase tracking-[0.25em] font-bold">
              <span>50/50 ODDS</span>
              <span>//</span>
              <span>PVP DUELS</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              COINFLIP ARENA
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 glass-capsule p-1 sm:p-1.5 rounded-full overflow-x-auto max-w-full">
            <Link
              href="/jackpot"
              className="glass-pill-inactive text-xs font-semibold px-3 sm:px-4 py-1.5 whitespace-nowrap"
            >
              JACKPOT
            </Link>
            <Link
              href="/coinflip"
              className="glass-pill-active text-xs font-bold px-3 sm:px-4 py-1.5 whitespace-nowrap"
            >
              COINFLIP
            </Link>
            <Link
              href="/mines"
              className="glass-pill-inactive text-xs font-semibold px-3 sm:px-4 py-1.5 whitespace-nowrap"
            >
              MINES
            </Link>
            <Link
              href="/cups"
              className="glass-pill-inactive text-xs font-semibold px-3 sm:px-4 py-1.5 whitespace-nowrap"
            >
              CUPS
            </Link>
          </div>
        </div>

        {/* Coinflip Arena Component */}
        <div className="glass-capsule rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
          <CoinFlipArena
            account={account}
            usdgBalance={usdgBalance}
            userProfile={userProfile}
            onOpenWalletModal={() => setShowWalletModal(true)}
            onShowToast={(msg, ok) =>
              setToastMsg({
                ok: !!ok,
                title: ok ? 'TRANSMISSION LOGGED' : 'DUEL ADVISORY',
                desc: msg,
              })
            }
          />
        </div>
      </main>

      {/* Footer */}
      <ProtocolFooter />

      {/* Live Dispatch Drawer */}
      <LiveDispatchDrawer
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        messages={messages}
        onSend={handleChat}
        currentUserId={account || 'guest_observer'}
      />

      {/* Modals */}
      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(type) => {
          connectWallet(type);
          setShowWalletModal(false);
        }}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        account={account}
        currentName={userProfile.name}
        currentAvatar={userProfile.avatar}
        onSaveProfile={handleSaveProfile}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 border max-w-sm w-full font-mono text-xs shadow-2xl ${
              toastMsg.ok
                ? 'bg-[#080C14] border-[#00E701] text-[#FFFFFF] shadow-[0_0_25px_rgba(205,180,134,0.25)]'
                : 'bg-[#080C14] border-red-500/60 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {toastMsg.title}
              </span>
              <span className="text-[9px] text-[#8993A4]">SYSTEM LOG</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#8993A4]">{toastMsg.desc}</p>
            {toastMsg.txHash && (
              <a
                href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${toastMsg.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#00E701] hover:underline"
              >
                <span>Inspect in Block Explorer</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
