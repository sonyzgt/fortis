'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { MinesArena } from '@/components/mines/MinesArena';
import { LiveDispatchDrawer } from '@/components/jackpot/LiveDispatchDrawer';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';

export default function MinesPage() {
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
  } | null>(null);

  // Load user profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kofuku_user_profile') || localStorage.getItem('cashflip_user_profile');
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
      localStorage.setItem('kofuku_user_profile', JSON.stringify(updated));
      localStorage.setItem('kofuku_profile_configured', 'true');
    } catch (e) {
      console.error('Failed to save profile', e);
    }
    setToastMsg({
      ok: true,
      title: 'PROFILE UPDATED',
      desc: `Display name set to "${name}".`,
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
      const senderName = userProfile.name?.trim() || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Player');
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
    <div className="min-h-screen bg-[#030508] text-[#F5F7FA] font-sans flex flex-col selection:bg-[#CDB486] selection:text-[#030508] relative overflow-x-hidden">
      {/* Ambient Atmospheric Liquid Glass Bubbles */}
      <AmbientLiquidBackground />

      {/* Sticky Header */}
      <ProtocolHeader
        currentRoute="mines"
        onOpenDispatch={() => setIsDispatchOpen(true)}
        dispatchCount={messages.length}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10 relative z-10">
        {/* Simple Clean Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2 text-left">
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F5F7FA]">
              MINES
            </h1>
            <p className="text-sm sm:text-base text-[#8993A4] leading-relaxed">
              Find the diamonds, avoid the mines. <br className="hidden sm:inline" />
              Cash out before you hit a bomb.
            </p>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 animate-float-natural filter drop-shadow-[0_10px_20px_rgba(205,180,134,0.3)]">
            <img src="/image/mine.png" alt="Mines Elephant" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* 3x3 Mines Arena */}
        <MinesArena
          account={account}
          usdgBalance={usdgBalance}
          userProfile={userProfile}
          onOpenWalletModal={() => setShowWalletModal(true)}
          onShowToast={(msg, ok) =>
            setToastMsg({
              ok: !!ok,
              title: ok ? 'SUCCESS' : 'NOTICE',
              desc: msg,
            })
          }
        />
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
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border max-w-sm backdrop-blur-md shadow-2xl ${
              toastMsg.ok
                ? 'bg-[#0a0d14]/95 border-[#CDB486]/50 text-[#F5F7FA]'
                : 'bg-[#0a0d14]/95 border-rose-500/50 text-[#F5F7FA]'
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  toastMsg.ok ? 'bg-[#CDB486]' : 'bg-rose-500'
                }`}
              />
              <span className={toastMsg.ok ? 'text-[#CDB486]' : 'text-rose-400'}>
                {toastMsg.title}
              </span>
            </div>
            <p className="text-xs text-[#8993A4] leading-relaxed">{toastMsg.desc}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
