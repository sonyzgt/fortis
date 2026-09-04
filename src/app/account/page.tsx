'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Settings,
  History,
  ShieldCheck,
  Trophy,
  Coins,
  ExternalLink,
  Copy,
  Check,
  Shuffle,
  Upload,
  Sparkles,
  Wallet,
  LogOut,
  Clock,
  CircleDot,
  Feather,
  Sun,
  Moon,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useTheme } from '@/context/ThemeContext';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { getUserStats } from '@/lib/levelSystem';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

const PRESET_AVATARS = [
  '/image/logo.png',
  'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyWhale',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CashFlipKing',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberChad',
  'https://api.dicebear.com/7.x/bottts/svg?seed=EmeraldMaster',
  'https://api.dicebear.com/7.x/bottts/svg?seed=DegenAce',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CryptoNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=RobinhoodBull',
];

const RANDOM_NAMES = [
  'AetherVoyager',
  'NocturneSeeker',
  'CelestialAce',
  'AstrolabeLord',
  'GildedOracle',
  'LunarArchon',
  'AlchemistCashFlip',
  'VeritasScholar',
  'OccultObserver',
  'ZephyrPatron',
];

export default function AccountPage() {
  const {
    account,
    isConnected,
    connectWallet,
    disconnectWallet,
    usdgBalance,
    usdgAllowance,
    refreshBalances,
  } = useCashFlipWeb3();
  const { theme, toggleTheme } = useTheme();

  // Profile Customization State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('/image/logo.png');
  const [customUrl, setCustomUrl] = useState('');
  const [activeAvatarTab, setActiveAvatarTab] = useState<'presets' | 'url' | 'upload'>('presets');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; title: string; desc: string } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load saved profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cashflip_user_profile') || localStorage.getItem('cashflip_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.avatar) setAvatar(parsed.avatar);
      } else if (account) {
        setName(`${account.slice(0, 6)}...${account.slice(-4)}`);
      }
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  }, [account]);

  // Fetch full game history (Jackpot & Coinflip)
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const apiBase = getApiBaseUrl();
        const ts = Date.now();
        const [resJp, resCf] = await Promise.all([
          fetch(`${apiBase}/api/game/history?_t=${ts}`, { cache: 'no-store' }).catch(() => null),
          fetch(`/api/coinflip/completed?_t=${ts}`, { cache: 'no-store' }).catch(() => null),
        ]);
        const jpData = resJp && resJp.ok ? await resJp.json() : [];
        const cfData = resCf && resCf.ok ? await resCf.json() : [];

        const combined = [
          ...(Array.isArray(jpData) ? jpData : []),
          ...(Array.isArray(cfData)
            ? cfData.map((c: any) => ({
                gameId: `CF-${c.roomNumber || c.id?.slice(0, 6) || 'DUEL'}`,
                nonce: c.roomNumber || 0,
                totalPool: c.winAmount || c.betAmount * 2 || 0,
                endTime: c.claimedAt || c.createdAt || Date.now(),
                players: [
                  { address: c.creatorId, totalBetPons: c.betAmount, odds: 50 },
                  ...(c.challengerId ? [{ address: c.challengerId, totalBetPons: c.betAmount, odds: 50 }] : []),
                ],
                winner: {
                  address: c.winnerId,
                  prizePons: c.winAmount || c.betAmount * 2,
                  odds: 50,
                  claimed: true,
                  claimTxHash: c.claimTxHash || null,
                },
              }))
            : []),
        ];
        setAllHistory(combined);
      } catch (e) {
        console.warn('Could not load game history', e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Filter personal rounds for the connected account
  const myRounds = useMemo(() => {
    if (!account || !allHistory.length) return [];
    const norm = account.toLowerCase();

    return allHistory
      .filter((g) => {
        const played = g.players?.some((p: any) => p.address?.toLowerCase() === norm);
        const won = g.winner?.address?.toLowerCase() === norm;
        return played || won;
      })
      .map((g) => {
        const myPlayerData = g.players?.find((p: any) => p.address?.toLowerCase() === norm);
        const isVictor = g.winner?.address?.toLowerCase() === norm;
        const winAmt = g.winner?.prize ?? g.winner?.prizePons ?? 0;
        return {
          gameId: g.gameId,
          nonce: g.nonce,
          totalPool: g.totalPool || 0,
          endTime: g.endTime,
          myBet: myPlayerData?.totalBet ?? myPlayerData?.totalBetPons ?? (isVictor ? winAmt : 0),
          myOdds: myPlayerData?.odds || (isVictor ? g.winner?.odds : 0),
          isVictor,
          prizeWon: isVictor ? winAmt : 0,
          claimed: isVictor ? !!g.winner?.claimed : false,
          claimTxHash: isVictor ? g.winner?.claimTxHash : null,
        };
      });
  }, [account, allHistory]);

  const totalWonUsdg = useMemo(() => {
    return myRounds.reduce((acc, r) => acc + (r.isVictor ? r.prizeWon : 0), 0);
  }, [myRounds]);

  const totalVictories = useMemo(() => {
    return myRounds.filter((r) => r.isVictor).length;
  }, [myRounds]);

  const handleRandomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    setName(`${random}${num}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setAvatar(src);
          return;
        }

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        setAvatar(compressed);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const finalName = name.trim() || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Initiate');
    const finalAvatar = avatar.trim() || '/image/logo.png';
    const profile = { name: finalName, avatar: finalAvatar };

    try {
      localStorage.setItem('cashflip_user_profile', JSON.stringify(profile));
      localStorage.setItem('cashflip_profile_configured', 'true');
      localStorage.setItem('cashflip_user_profile', JSON.stringify(profile));
      localStorage.setItem('cashflip_profile_configured', 'true');
      setToastMsg({
        ok: true,
        title: 'Persona Changes Inscribed',
        desc: `Callsign: "${finalName}" saved to observatory archives.`,
      });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const userStats = getUserStats(account);

  return (
    <div className="min-h-screen overflow-y-auto bg-[#E8DFD1] text-[#171513] font-serif select-none pb-24">
      {/* ── Top Masthead ── */}
      <header className="sticky top-0 z-40 h-16 border-b border-[#171513]/20 bg-[#E8DFD1] px-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4EFE6] hover:bg-[#DDD2C1] border border-[#171513]/20 text-xs font-serif transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9E8055]" />
            <span>Return to Sanctum</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#171513]/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 border border-[#9E8055] p-0.5 bg-[#F4EFE6] flex items-center justify-center flex-shrink-0">
              <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-serif font-semibold tracking-wider text-[#171513]">
              CASHFLIP OBSERVATOIRE
            </span>
            <span className="px-2 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px] font-mono tracking-widest uppercase">
              ACCOUNT & HISTORY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 border border-[#171513]/20 bg-[#F4EFE6] hover:bg-[#E8DFD1] text-[#171513] flex items-center justify-center transition-colors shadow-sm"
            title={theme === 'dark' ? 'Ganti ke Tema Terang (Parchment)' : 'Ganti ke Tema Gelap (Nocturnal)'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#DFC493]" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9E8055]" />
            )}
          </button>

          {isConnected && (
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4EFE6] hover:bg-red-100 border border-[#171513]/20 text-xs text-red-900 transition-colors font-serif"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!isConnected ? (
          /* When wallet is not connected */
          <div className="editorial-frame p-8 sm:p-12 bg-[#F4EFE6] text-center space-y-4 shadow-sm relative">
            <BookplateCorner />
            <div className="w-16 h-16 border border-[#9E8055] bg-[#E8DFD1] p-2 flex items-center justify-center mx-auto shadow-inner">
              <Wallet className="w-8 h-8 text-[#9E8055]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-semibold text-[#171513]">
                CONNECT CRYPTOGRAPHIC LEDGER
              </h2>
              <p className="text-xs text-[#171513]/65 max-w-md mx-auto leading-relaxed">
                Connect your Web3 wallet to inspect your persona registry, manage display credentials, and review historical epoch participations.
              </p>
            </div>
            <button
              onClick={() => setShowWalletModal(true)}
              className="px-6 py-2.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 inline-flex items-center gap-2 shadow-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#9E8055]" />
              <span>CONSULT CODEX & CONNECT</span>
            </button>
          </div>
        ) : (
          /* When wallet is connected */
          <>
            {/* Top Identity Ledger Plate */}
            <div className="editorial-frame p-6 bg-[#F4EFE6] shadow-sm space-y-4 relative">
              <BookplateCorner />

              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-4 border-b border-[#171513]/15">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border border-[#9E8055] p-1 bg-[#E8DFD1] flex-shrink-0 shadow-inner">
                    <img src={avatar || '/image/logo.png'} alt="Persona" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-[#9E8055] block">
                      Inscribed Persona
                    </span>
                    <h1 className="text-xl font-serif font-semibold text-[#171513]">
                      {name || 'Initiate Persona'}
                    </h1>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-xs font-mono text-[#171513]/70">
                        {account?.slice(0, 10)}...{account?.slice(-8)}
                      </span>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-[#DDD2C1] border border-[#171513]/15 text-[#171513]/60 transition-colors"
                        title="Copy full ledger address"
                      >
                        {copiedAddress ? <Check className="w-3 h-3 text-[#9E8055]" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a
                        href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${account}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-[#DDD2C1] border border-[#171513]/15 text-[#171513]/60 transition-colors"
                        title="Inspect on Robinhood Blockscout"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#171513]/10">
                  <span className="text-[9px] font-serif uppercase tracking-widest text-[#9E8055] block">
                    Sanctuary Balance
                  </span>
                  <div className="text-lg font-mono font-bold text-[#171513]">
                    {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-[#9E8055] font-serif">USDG</span>
                  </div>
                  <span className="text-[10px] font-serif text-[#171513]/60 block mt-0.5">
                    Allowance: {usdgAllowance >= 100000000 ? 'Unlimited' : `${usdgAllowance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG`}
                  </span>
                </div>
              </div>

              {/* Statistics Triad */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
                  <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">
                    Epochs Participated
                  </span>
                  <span className="text-base font-mono font-semibold text-[#171513] mt-0.5 block">
                    {myRounds.length}
                  </span>
                </div>
                <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
                  <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">
                    Victories Consecrated
                  </span>
                  <span className="text-base font-serif font-semibold text-[#171513] mt-0.5 block">
                    {totalVictories}
                  </span>
                </div>
                <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15">
                  <span className="text-[9px] uppercase tracking-widest text-[#9E8055] block">
                    Total Winnings
                  </span>
                  <span className="text-base font-mono font-semibold text-[#171513] mt-0.5 block">
                    {totalWonUsdg.toLocaleString()} USDG
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Settings & Persona Customization */}
            <section className="editorial-frame p-6 bg-[#F4EFE6] space-y-4 shadow-sm relative">
              <BookplateCorner />

              <div className="flex items-center gap-2.5 pb-3 border-b border-[#171513]/15">
                <Settings className="w-4 h-4 text-[#9E8055]" />
                <h2 className="text-sm font-serif font-semibold tracking-wider text-[#171513] uppercase">
                  PERSONA INSCRIPTION & SETTINGS
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Callsign Input */}
                <div className="space-y-2">
                  <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                    CALLSIGN / NICKNAME
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={20}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Inscribe title or name..."
                      className="flex-1 px-3 py-2 bg-[#E8DFD1] border border-[#171513]/25 text-xs font-serif text-[#171513] focus:outline-none focus:border-[#9E8055]"
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeName}
                      className="px-3 py-2 bg-[#E8DFD1] hover:bg-[#DDD2C1] border border-[#171513]/25 text-xs font-serif text-[#171513] flex items-center gap-1.5 transition-colors"
                      title="Draw random celestial name"
                    >
                      <Shuffle className="w-3 h-3 text-[#9E8055]" />
                      <span className="text-[10px] tracking-wider uppercase">Cast</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#171513]/60 italic font-serif">
                    This callsign appears across the arena ledger, victor announcements, and chronicle dispatches.
                  </p>
                </div>

                {/* Avatar Source Tabs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] tracking-[0.2em] font-serif uppercase text-[#171513]/70 block font-medium">
                      SEAL PORTRAIT
                    </label>
                    <div className="flex items-center gap-1 text-[9px] font-serif tracking-wider uppercase">
                      {(['presets', 'url', 'upload'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveAvatarTab(tab)}
                          className={`px-2 py-0.5 border transition-colors ${
                            activeAvatarTab === tab
                              ? 'bg-[#171513] text-[#F4EFE6] border-[#171513]'
                              : 'bg-[#E8DFD1] text-[#171513]/70 border-[#171513]/20 hover:text-[#171513]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activeAvatarTab === 'presets' && (
                    <div className="grid grid-cols-4 gap-2 p-2 bg-[#E8DFD1] border border-[#171513]/15">
                      {PRESET_AVATARS.map((pUrl, idx) => {
                        const isSelected = avatar === pUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setAvatar(pUrl)}
                            className={`relative aspect-square p-1 border transition-all flex items-center justify-center ${
                              isSelected
                                ? 'border-[#9E8055] bg-[#F4EFE6] ring-1 ring-[#9E8055]'
                                : 'border-[#171513]/15 bg-[#E8DFD1] hover:border-[#171513]/40'
                            }`}
                          >
                            <img src={pUrl} alt="" className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#171513] text-[#F4EFE6] flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeAvatarTab === 'url' && (
                    <div className="space-y-2 p-2.5 bg-[#E8DFD1] border border-[#171513]/15">
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://... (direct image link)"
                          className="flex-1 px-3 py-1.5 bg-[#F4EFE6] border border-[#171513]/20 text-xs font-mono text-[#171513] focus:outline-none focus:border-[#9E8055]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customUrl.trim()) setAvatar(customUrl.trim());
                          }}
                          className="px-3 py-1.5 bg-[#171513] text-[#F4EFE6] font-serif text-[11px] tracking-wider uppercase"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {activeAvatarTab === 'upload' && (
                    <div className="p-3 bg-[#E8DFD1] border border-[#171513]/15 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 border border-dashed border-[#171513]/30 hover:border-[#9E8055] transition-colors flex items-center justify-center gap-2 text-xs font-serif"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#9E8055]" />
                        <span>Select image file (PNG, JPG, max 2MB)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-6 py-2.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Feather className="w-3.5 h-3.5 text-[#9E8055]" />
                  <span>RECORD INSCRIPTION</span>
                </button>
              </div>
            </section>

            {/* Section 2: Personal Orbit History */}
            <section className="editorial-frame p-6 bg-[#F4EFE6] space-y-4 shadow-sm relative">
              <BookplateCorner />

              <div className="flex items-center justify-between pb-3 border-b border-[#171513]/15">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-[#9E8055]" />
                  <h2 className="text-sm font-serif font-semibold tracking-wider text-[#171513] uppercase">
                    PERSONAL ORBIT CHRONICLE
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#171513]/60">
                  {myRounds.length} Rounds Recorded
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs font-serif text-[#171513]/60 italic">
                  Consulting observatory archives...
                </div>
              ) : myRounds.length === 0 ? (
                <div className="py-12 text-center text-xs font-serif text-[#171513]/60 italic space-y-2">
                  <p>No historical rounds recorded yet for this ledger address.</p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-xs text-[#9E8055] font-semibold underline hover:text-[#171513]"
                  >
                    <span>Inscribe your premier wager in the Arena</span>
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-serif">
                    <thead>
                      <tr className="border-b border-[#171513]/20 text-[#171513]/60 text-[10px] uppercase tracking-wider">
                        <th className="py-2.5">EPOCH</th>
                        <th>WAGER</th>
                        <th>ODDS</th>
                        <th>OUTCOME</th>
                        <th>DISPENSATION</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#171513]/10 font-mono text-[11px]">
                      {myRounds.map((r) => (
                        <tr key={r.gameId} className="hover:bg-[#E8DFD1]/50 transition-colors">
                          <td className="py-2.5 font-semibold text-[#171513]">
                            #{r.gameId.replace(/^CASHFLIP-/, '')}
                          </td>
                          <td className="text-[#171513]">
                            {r.myBet.toLocaleString()} <span className="text-[9px] text-[#9E8055]">USDG</span>
                          </td>
                          <td className="text-[#171513]/70">{r.myOdds}%</td>
                          <td>
                            {r.isVictor ? (
                              <span className="px-2 py-0.5 border border-[#9E8055] bg-[#9E8055]/10 text-[#9E8055] text-[9px] font-serif font-bold uppercase tracking-wider">
                                👑 Victor
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 border border-[#171513]/20 text-[#171513]/60 text-[9px] font-serif uppercase">
                                Contender
                              </span>
                            )}
                          </td>
                          <td className="font-semibold text-[#171513]">
                            {r.isVictor ? (
                              <span>{r.prizeWon.toLocaleString()} USDG</span>
                            ) : (
                              <span className="text-[#171513]/40">—</span>
                            )}
                          </td>
                          <td>
                            {r.isVictor ? (
                              r.claimed ? (
                                <span className="text-[10px] text-[#9E8055] font-serif font-semibold">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-800 font-serif font-semibold animate-pulse">
                                  Unclaimed
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-[#171513]/40 font-serif">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        <CelestialFlourish />
      </main>

      {/* Floating notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="editorial-frame fixed top-20 right-6 z-50 p-4 bg-[#E8DFD1] text-[#171513] border-[#9E8055] shadow-lg text-xs space-y-1 select-none"
          >
            <p className="font-serif font-semibold text-[#171513]">{toastMsg.title}</p>
            <p className="text-[11px] text-[#171513]/70 font-serif">{toastMsg.desc}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Select Modal */}
      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(type) => connectWallet(type)}
      />
    </div>
  );
}
