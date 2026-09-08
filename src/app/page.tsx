'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSound } from '@/context/SoundContext';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { LiveDispatchDrawer } from '@/components/jackpot/LiveDispatchDrawer';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  Trophy,
  Coins,
  Gem,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ROBINHOOD_CHAIN_CONFIG, CASHFLIP_TOKEN_ADDRESS, getCashFlipTokenAddress, TOKEN_SYMBOL } from '@/lib/web3/contracts';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';

export default function KofukuHomePage() {
  const { socket } = useSocket();
  const {
    account,
    isConnected,
    usdgBalance,
    connectWallet,
  } = useCashFlipWeb3();

  // Modals state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Profile customization state
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kofuku_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) {
        setUserProfile(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
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
  }, []);

  // Listen to chat
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

  const tokenContractAddress = getCashFlipTokenAddress() || CASHFLIP_TOKEN_ADDRESS;

  return (
    <div className="min-h-screen bg-[#030508] text-[#E8DFCF] font-sans selection:bg-[#CDB486] selection:text-[#030508] flex flex-col relative overflow-x-hidden">
      {/* Ambient Liquid Glass Atmospheric Bubbles Background */}
      <AmbientLiquidBackground />

      {/* ─────────────────────────────────────────────────────────────
          NAVBAR (MINIMAL & MODERN)
          ───────────────────────────────────────────────────────────── */}
      <ProtocolHeader
        currentRoute="home"
        onOpenDispatch={() => setIsDispatchOpen(true)}
        dispatchCount={messages.length}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION (2-COLUMN LAYOUT)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32 px-4 sm:px-8 lg:px-12 border-b border-white/[0.05] relative z-10">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-capsule border-white/10 text-xs font-mono text-[#CDB486] tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CDB486] animate-pulse" />
              ROBINHOOD CHAIN
            </div>

            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F5F0E6] leading-[1.04]">
              THE HOUSE <br />
              <span className="text-[#8993A4]">DOES NOT</span> <br />
              <span className="text-[#CDB486]">PLAY.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#8993A4] leading-relaxed max-w-lg font-normal">
              A provably fair Web3 gaming platform on Robinhood Chain. Non-custodial, transparent, instant settlement.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/jackpot"
                className="glass-btn-inflated px-8 py-3.5 text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl"
              >
                <span>PLAY NOW</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#features"
                className="px-8 py-3.5 text-sm font-semibold uppercase tracking-wider glass-capsule border-white/15 text-[#F5F0E6] hover:text-[#CDB486] hover:border-[#CDB486]/40 transition-all cursor-pointer inline-flex items-center justify-center"
              >
                HOW IT WORKS
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: FLOATING 3D CASHFLIP LIQUID GLASS ARTIFACT */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
              {/* Soft Ambient Refractive Halo */}
              <div className="absolute inset-2 rounded-full bg-[#CDB486]/[0.08] blur-3xl pointer-events-none" />

              {/* Free-Floating 3D Liquid Glass Artifact (No bounding box) */}
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center animate-float-natural filter drop-shadow-[0_25px_45px_rgba(205,180,134,0.3)]">
                <img
                  src="/image/logo.png"
                  alt="KOFUKU Origami Mascot"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. GAME SECTION (3 LARGE LIQUID GLASS EXPERIENCES)
          Title: CHOOSE YOUR GAME
          ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 lg:px-12 border-b border-white/[0.04] relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-left space-y-2">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F5F7FA]">
              CHOOSE YOUR GAME
            </h2>
            <p className="text-sm sm:text-base text-[#8993A4] max-w-xl">
              Four autonomous gaming experiences designed for transparency and instant on-chain settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CARD 1: JACKPOT */}
            <div className="glass-capsule flex flex-col justify-between p-7 group">
              <div className="space-y-5">
                {/* 3D Origami Artwork */}
                <div className="w-full h-44 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-center relative overflow-hidden group-hover:border-[#CDB486]/35 transition-colors">
                  <div className="w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_15px_30px_rgba(205,180,134,0.25)] animate-float-natural">
                    <img
                      src="/image/jackpot.png"
                      alt="Jackpot Origami"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className="font-heading text-xl font-bold text-[#F5F0E6]">
                    JACKPOT
                  </h3>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Multiplayer pool of capital where probability converges to a single victor.
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/jackpot"
                  className="glass-btn-inflated w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>PLAY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CARD 2: COINFLIP */}
            <div className="glass-capsule flex flex-col justify-between p-7 group">
              <div className="space-y-5">
                {/* 3D Origami Artwork */}
                <div className="w-full h-44 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-center relative overflow-hidden group-hover:border-[#CDB486]/35 transition-colors">
                  <div className="w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_15px_30px_rgba(205,180,134,0.25)] animate-float-natural">
                    <img
                      src="/image/flipcoin.png"
                      alt="Coinflip Origami"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className="font-heading text-xl font-bold text-[#F5F0E6]">
                    COINFLIP
                  </h3>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Head-to-head 1v1 binary duels with instant cryptographic settlement.
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/coinflip"
                  className="glass-btn-inflated w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>PLAY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CARD 3: MINES */}
            <div className="glass-capsule flex flex-col justify-between p-7 group">
              <div className="space-y-5">
                {/* 3D Origami Artwork */}
                <div className="w-full h-44 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-center relative overflow-hidden group-hover:border-[#CDB486]/35 transition-colors">
                  <div className="w-32 h-32 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_15px_30px_rgba(205,180,134,0.25)] animate-float-natural">
                    <img
                      src="/image/mine.png"
                      alt="Mines Origami"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className="font-heading text-xl font-bold text-[#F5F0E6]">
                    MINES
                  </h3>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Uncover safe refractive gemstones, avoid demolition bombs, and cash out anytime.
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/mines"
                  className="glass-btn-inflated w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>PLAY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* CARD 4: CUPS */}
            <div className="glass-capsule flex flex-col justify-between p-7 group">
              <div className="space-y-5">
                {/* 3D Artwork */}
                <div className="w-full h-44 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-center relative overflow-hidden group-hover:border-[#CDB486]/35 transition-colors">
                  <div className="w-28 h-28 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 filter drop-shadow-[0_15px_30px_rgba(205,180,134,0.25)] animate-float-natural">
                    <img
                      src="/logo.png"
                      alt="Cups Emblem"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <h3 className="font-heading text-xl font-bold text-[#F5F0E6]">
                    CUPS
                  </h3>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Uncover the hidden KOFUKU emblem under 3 tactile glass cups with 2 chances to win.
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/cups"
                  className="glass-btn-inflated w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>PLAY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. LIVE STATS SECTION (FLOATING GLASS CAPSULES)
          ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 lg:px-12 border-b border-white/[0.05] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="glass-capsule p-6 sm:p-8 space-y-2 text-left">
              <span className="text-xs font-medium uppercase tracking-wider text-[#8993A4] block">
                TOTAL WAGERED
              </span>
              <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F5F0E6]">
                0 <span className="text-lg text-[#CDB486]">{TOKEN_SYMBOL}</span>
              </div>
            </div>

            <div className="glass-capsule p-6 sm:p-8 space-y-2 text-left">
              <span className="text-xs font-medium uppercase tracking-wider text-[#8993A4] block">
                PLAYERS
              </span>
              <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#F5F0E6]">
                0
              </div>
            </div>

            <div className="glass-capsule p-6 sm:p-8 space-y-2 text-left">
              <span className="text-xs font-medium uppercase tracking-wider text-[#8993A4] block">
                LARGEST WIN
              </span>
              <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#CDB486]">
                0 <span className="text-lg text-[#CDB486]">{TOKEN_SYMBOL}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. FEATURES SECTION (TRUST & INTEGRITY)
          ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-8 lg:px-12 border-b border-white/[0.05] relative z-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-left space-y-2">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F5F0E6]">
              PLAY WITH CONFIDENCE.
            </h2>
            <p className="text-sm sm:text-base text-[#8993A4] max-w-lg">
              Built for transparency and fairness. Every outcome is verifiable on-chain with zero hidden algorithms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1: NON-CUSTODIAL */}
            <div className="glass-capsule p-8 space-y-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#CDB486]/10 border border-[#CDB486]/25 flex items-center justify-center text-[#CDB486] shadow-inner">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#F5F0E6] uppercase tracking-wide">
                NON-CUSTODIAL
              </h3>
              <p className="text-sm text-[#8993A4] leading-relaxed">
                Your funds remain under your control. Wagers interact directly with verified smart contracts, and winnings are disbursed straight to your wallet.
              </p>
            </div>

            {/* Feature 2: SMART CONTRACTS */}
            <div className="glass-capsule p-8 space-y-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#CDB486]/10 border border-[#CDB486]/25 flex items-center justify-center text-[#CDB486] shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#F5F0E6] uppercase tracking-wide">
                SMART CONTRACTS
              </h3>
              <p className="text-sm text-[#8993A4] leading-relaxed">
                Autonomous and immutable logic ensures that no house, team, or intermediary can alter round outcomes or restrict withdrawals.
              </p>
            </div>

            {/* Feature 3: ROBINHOOD CHAIN */}
            <div className="glass-capsule p-8 space-y-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#CDB486]/10 border border-[#CDB486]/25 flex items-center justify-center text-[#CDB486] shadow-inner">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#F5F0E6] uppercase tracking-wide">
                ROBINHOOD CHAIN
              </h3>
              <p className="text-sm text-[#8993A4] leading-relaxed">
                Powered by Chain ID 4663. Ultra-fast sub-second finality, minimal transaction fees, and native settlement in {TOKEN_SYMBOL}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER (CLEAN & MINIMAL WITH DOCS)
          ───────────────────────────────────────────────────────────── */}
      <ProtocolFooter />

      {/* ─────────────────────────────────────────────────────────────
          GLOBAL MODALS & DRAWER
          ───────────────────────────────────────────────────────────── */}
      <LiveDispatchDrawer
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        messages={messages}
        onSend={handleChat}
        currentUserId={account || 'guest_observer'}
      />

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
    </div>
  );
}
