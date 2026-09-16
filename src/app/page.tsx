'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { LiveDispatchDrawer } from '@/components/jackpot/LiveDispatchDrawer';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import { StakeBanner } from '@/components/stake/StakeBanner';
import { StakeGameCard } from '@/components/stake/StakeGameCard';
import { StakeLiveBets } from '@/components/stake/StakeLiveBets';
import {
  ShieldCheck,
  Zap,
  Lock,
  Flame,
  Sparkles,
  Trophy,
  Coins,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

const CATEGORIES = [
  { id: 'originals', label: 'Stake Originals', icon: Flame, active: true },
  { id: 'slots', label: 'All Games', icon: Layers, active: false },
  { id: 'live', label: 'Live Events', icon: Sparkles, active: false },
];

export default function StakeHomePage() {
  const { socket } = useSocket();
  const { account, connectWallet } = useCashFlipWeb3();

  // Modals state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('originals');

  // User Profile
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  // Platform Telemetry
  const [stats, setStats] = useState<{
    totalWagered: number;
    totalPlayers: number;
    largestWin: number;
  }>({
    totalWagered: 0,
    totalPlayers: 0,
    largestWin: 0,
  });

  useEffect(() => {
    fetch('/api/platform/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setStats({
            totalWagered: Number(data.totalWagered) || 0,
            totalPlayers: Number(data.totalPlayers) || 0,
            largestWin: Number(data.largestWin) || 0,
          });
        }
      })
      .catch((err) => console.warn('Failed to load stats', err));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleStats = (data: any) => {
      if (data) {
        setStats({
          totalWagered: Number(data.totalWagered) || 0,
          totalPlayers: Number(data.totalPlayers) || 0,
          largestWin: Number(data.largestWin) || 0,
        });
      }
    };
    socket.on('platform_stats', handleStats);
    return () => {
      socket.off('platform_stats', handleStats);
    };
  }, [socket]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fortis_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) setUserProfile(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleSaveProfile = useCallback((name: string, avatar: string) => {
    const finalAvatar = avatar || '/image/logo.png';
    const updated = { name, avatar: finalAvatar };
    setUserProfile(updated);
    try {
      localStorage.setItem('fortis_user_profile', JSON.stringify(updated));
    } catch (e) {}
  }, []);

  // Chat listener
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
    <div className="min-h-screen bg-[#071824] text-white flex flex-col">
      {/* Stake Top Bar Header */}
      <ProtocolHeader
        currentRoute="home"
        onOpenDispatch={() => setIsDispatchOpen(true)}
        dispatchCount={messages.length}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* 1. Hero Promotional Banner Slider */}
        <StakeBanner />

        {/* 2. Stake Lobby Navigation Tabs / Category Pills */}
        <div className="flex items-center justify-between border-b border-[#213743] pb-3 gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#1A2C38] text-white border border-[#213743] shadow-sm'
                      : 'text-[#B1BAD3] hover:text-white hover:bg-[#1A2C38]/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#00E701]' : 'text-[#557086]'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#557086]">
            <span>ROBINHOOD CHAIN</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E701]" />
          </div>
        </div>

        {/* 3. Stake Originals Game Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-md bg-[#00E701]/10 text-[#00E701]">
                <Flame className="w-5 h-5" />
              </span>
              <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight">
                Stake Originals
              </h2>
            </div>
            <Link
              href="/jackpot"
              className="text-xs font-semibold text-[#B1BAD3] hover:text-[#00E701] flex items-center gap-1 transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Grid of 4 Games with Stake Card Styling */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            <StakeGameCard
              title="JACKPOT"
              description="Multiplayer pool. Winner takes all."
              href="/jackpot"
              imageSrc="/image/jackpot.png?v=fresh"
              badge="HOT"
              accentColor="#FFC432"
            />
            <StakeGameCard
              title="COINFLIP"
              description="1v1 Binary duels with instant payout."
              href="/coinflip"
              imageSrc="/image/flipcoin.png?v=fresh"
              badge={null}
              accentColor="#00E701"
            />
            <StakeGameCard
              title="MINES"
              description="Uncover gems, dodge bombs & cash out."
              href="/mines"
              imageSrc="/image/mine.png?v=fresh"
              badge="NEW"
              accentColor="#3498DB"
            />
            <StakeGameCard
              title="CUPS"
              description="Track the shuffle & pick the right cup."
              href="/cups"
              imageSrc="/image/cups.png?v=fresh"
              badge={null}
              accentColor="#E74C3C"
            />
          </div>
        </div>

        {/* 4. Telemetry Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-[#557086] uppercase tracking-wider block mb-1">
                Total Wagered
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {stats.totalWagered.toLocaleString()}{' '}
                <span className="text-sm text-[#00E701] font-semibold">{TOKEN_SYMBOL}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#071824] border border-[#213743] flex items-center justify-center text-[#00E701]">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-[#557086] uppercase tracking-wider block mb-1">
                Total Players
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {stats.totalPlayers.toLocaleString()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#071824] border border-[#213743] flex items-center justify-center text-[#3498DB]">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-[#557086] uppercase tracking-wider block mb-1">
                Largest Win
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#FFC432] font-mono">
                {stats.largestWin.toLocaleString()}{' '}
                <span className="text-sm font-semibold">{TOKEN_SYMBOL}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#071824] border border-[#213743] flex items-center justify-center text-[#FFC432]">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 5. Stake Live Bets Ticker Table */}
        <div className="space-y-3">
          <StakeLiveBets />
        </div>

        {/* 6. Provably Fair & Trust Guarantee */}
        <div className="bg-[#0F212E] border border-[#213743] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-3xl mb-6">
            <h3 className="text-white font-extrabold text-xl sm:text-2xl tracking-tight mb-2">
              Leading Web3 Provably Fair Casino
            </h3>
            <p className="text-[#B1BAD3] text-sm leading-relaxed">
              Every bet on our platform is executed through autonomous smart contracts deployed on Robinhood Chain. Wagers are non-custodial and payouts are disbursed instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#00E701]/10 border border-[#00E701]/30 flex items-center justify-center text-[#00E701]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Provably Fair</h4>
              <p className="text-[#B1BAD3] text-xs leading-relaxed">
                Cryptographic seed verification ensures each outcome is pre-determined and unmanipulatable.
              </p>
            </div>

            <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#3498DB]/10 border border-[#3498DB]/30 flex items-center justify-center text-[#3498DB]">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Non-Custodial</h4>
              <p className="text-[#B1BAD3] text-xs leading-relaxed">
                You retain full custody of your funds. Winnings transfer directly into your connected wallet.
              </p>
            </div>

            <div className="bg-[#1A2C38] border border-[#213743] rounded-xl p-5 space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FFC432]/10 border border-[#FFC432]/30 flex items-center justify-center text-[#FFC432]">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-white font-bold text-sm">Sub-Second Finality</h4>
              <p className="text-[#B1BAD3] text-xs leading-relaxed">
                Powered by Robinhood Chain with ultra-low gas fees and lightning-fast block times.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <ProtocolFooter />

      {/* Global Modals */}
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
