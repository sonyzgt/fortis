'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  ShieldCheck,
  Trophy,
  ExternalLink,
  Copy,
  Check,
  Shuffle,
  Upload,
  Wallet,
  Clock,
  CircleDot,
  Terminal,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { getUserStats } from '@/lib/levelSystem';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { VerifyModal } from '@/components/cashflip/VerifyModal';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';

const RANDOM_NAMES = [
  'AetherNode',
  'NocturneCipher',
  'VanguardKofuku',
  'ZeroExOperator',
  'GildedOracle',
  'ArchonVault',
  'QuantObserver',
  'VeritasScalar',
  'SubZeroUnit',
  'SpectralApex',
];

export default function AccountPage() {
  const {
    account,
    isConnected,
    usdgBalance,
    usdgAllowance,
  } = useCashFlipWeb3();

  // Profile Customization State
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('/image/logo.png');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; title: string; desc: string } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [verifyTargetGameId, setVerifyTargetGameId] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load saved profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kofuku_user_profile') || localStorage.getItem('cashflip_user_profile');
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
                totalPool: c.betAmount * 2,
                winner: {
                  address: c.winner === 'creator' ? c.creatorAddress : c.challengerAddress,
                  prize: Number((c.betAmount * 2 * 0.98).toFixed(2)),
                  winningTicket: c.winningSide === 'heads' ? 'HEADS' : 'TAILS',
                },
                timestamp: c.completedAt || c.createdAt || Date.now(),
                type: 'coinflip',
              }))
            : []),
        ];

        combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setAllHistory(combined);
      } catch (e) {
        console.warn('Failed to load ledger history', e);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  // Filter history for currently connected user
  const myRounds = useMemo(() => {
    if (!account) return [];
    const accLower = account.toLowerCase();
    return allHistory.filter((g) => {
      if (g.winner?.address && g.winner.address.toLowerCase() === accLower) return true;
      if (Array.isArray(g.players)) {
        return g.players.some((p: any) => p.address && p.address.toLowerCase() === accLower);
      }
      return false;
    });
  }, [allHistory, account]);

  const totalVictories = useMemo(() => {
    if (!account) return 0;
    const accLower = account.toLowerCase();
    return myRounds.filter(
      (g) => g.winner?.address && g.winner.address.toLowerCase() === accLower
    ).length;
  }, [myRounds, account]);

  const totalWonUsdg = useMemo(() => {
    if (!account) return 0;
    const accLower = account.toLowerCase();
    return myRounds
      .filter((g) => g.winner?.address && g.winner.address.toLowerCase() === accLower)
      .reduce((sum, g) => sum + (g.winner?.prize || g.winner?.prizePons || 0), 0);
  }, [myRounds, account]);

  const handleRandomizeName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    setName(`${random}-${num}`);
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
      localStorage.setItem('kofuku_user_profile', JSON.stringify(profile));
      localStorage.setItem('kofuku_profile_configured', 'true');
      localStorage.setItem('cashflip_user_profile', JSON.stringify(profile));
      localStorage.setItem('cashflip_profile_configured', 'true');
      setToastMsg({
        ok: true,
        title: 'IDENTITY COMMITTED',
        desc: `Callsign "${finalName}" saved to profile.`,
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
    <div className="min-h-screen bg-[#030508] text-[#F5F7FA] font-sans selection:bg-[#CDB486] selection:text-[#030508] flex flex-col relative overflow-x-hidden">
      {/* Ambient Liquid Glass Atmospheric Bubbles Background */}
      <AmbientLiquidBackground />

      {/* Header */}
      <ProtocolHeader
        currentRoute="account"
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6 relative z-10">
        {!isConnected ? (
          /* When wallet is not connected */
          <div className="glass-capsule rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/25 flex items-center justify-center mx-auto text-[#CDB486] shadow-inner">
              <Wallet className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-heading font-bold uppercase tracking-wider text-[#F5F7FA]">
                CONNECT WALLET IDENTITY
              </h2>
              <p className="text-sm text-[#8993A4] max-w-md mx-auto leading-relaxed">
                Connect your decentralized Web3 wallet to inspect operator credentials, manage display signatures, and review historical epoch participations.
              </p>
            </div>
            <button
              onClick={() => setShowWalletModal(true)}
              className="glass-btn-inflated px-8 py-3.5 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>CONNECT WALLET ↗</span>
            </button>
          </div>
        ) : (
          /* When wallet is connected */
          <>
            {/* Top Identity Ledger Node */}
            <div className="glass-capsule rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 p-1 shadow-inner flex-shrink-0 overflow-hidden">
                    <img src={avatar || '/image/logo.png'} alt="Persona" className="w-full h-full object-cover rounded-xl" />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#CDB486] block font-bold font-mono">
                      AUTHENTICATED OPERATOR
                    </span>
                    <h1 className="text-xl font-heading font-bold text-[#F5F7FA] uppercase tracking-wider">
                      {name || 'INITIATE CIPHER'}
                    </h1>
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-xs text-[#8993A4]">
                      <span className="font-mono">{account?.slice(0, 10)}...{account?.slice(-8)}</span>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-[#CDB486]/10 border border-white/[0.08] hover:border-[#CDB486]/30 rounded-lg text-[#8993A4] hover:text-[#CDB486] transition-colors"
                        title="Copy full address"
                      >
                        {copiedAddress ? <Check className="w-3 h-3 text-[#CDB486]" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a
                        href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/address/${account}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-[#CDB486]/10 border border-white/[0.08] hover:border-[#CDB486]/30 rounded-lg text-[#8993A4] hover:text-[#CDB486] transition-colors"
                        title="Inspect in Block Explorer"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-center sm:text-right font-mono">
                  <span className="text-[10px] uppercase tracking-widest text-[#8993A4] block">
                    VAULT RESERVE
                  </span>
                  <div className="text-2xl font-bold text-[#CDB486] drop-shadow-[0_0_12px_rgba(205, 180, 134,0.35)]">
                    {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-[#F5F7FA]/60">USDG</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-0.5">
                    Allowance: {usdgAllowance >= 100000000 ? 'Unlimited' : `${usdgAllowance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG`}
                  </span>
                </div>
              </div>

              {/* Statistics Triad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="glass-capsule p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-widest text-[#8993A4] block font-mono">
                    EPOCHS PARTICIPATED
                  </span>
                  <span className="text-xl font-heading font-bold text-[#F5F7FA] mt-1 block">
                    {myRounds.length}
                  </span>
                </div>
                <div className="glass-capsule p-4 rounded-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#CDB486]/[0.03] pointer-events-none" />
                  <span className="text-[10px] uppercase tracking-widest text-[#CDB486] block font-mono font-bold">
                    VICTORIES CONCLUDED
                  </span>
                  <span className="text-xl font-heading font-bold text-[#CDB486] mt-1 block drop-shadow-[0_0_8px_rgba(205, 180, 134,0.3)]">
                    {totalVictories}
                  </span>
                </div>
                <div className="glass-capsule p-4 rounded-2xl">
                  <span className="text-[10px] uppercase tracking-widest text-[#8993A4] block font-mono">
                    TOTAL ALLOTMENT YIELD
                  </span>
                  <span className="text-xl font-heading font-bold text-[#F5F7FA] mt-1 block">
                    {totalWonUsdg.toLocaleString()} USDG
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Settings & Persona Customization */}
            <section className="glass-capsule rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
                <Settings className="w-5 h-5 text-[#CDB486]" />
                <h2 className="text-base font-heading font-bold tracking-wider text-[#F5F7FA] uppercase">
                  OPERATOR SPECIFICATION & SETTINGS
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Callsign Input */}
                <div className="space-y-3">
                  <label className="text-[11px] tracking-[0.15em] uppercase text-[#8993A4] block font-bold font-mono">
                    CALLSIGN / NICKNAME
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={20}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter callsign..."
                      className="glass-input flex-1 px-4 py-2.5 text-xs text-[#F5F7FA] placeholder-[#8993A4]/50"
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeName}
                      className="glass-btn-chip px-3.5 py-2.5 flex items-center gap-1.5 cursor-pointer text-[#CDB486]"
                      title="Generate random callsign"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase font-bold font-mono">GEN</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8993A4]/70">
                    Displayed on the Convergence Carousel, Live Dispatch, and Historical Archives.
                  </p>
                </div>

                {/* Avatar Tabs */}
                {/* Avatar Upload */}
                <div className="space-y-3">
                  <label className="text-[11px] tracking-[0.15em] uppercase text-[#8993A4] block font-bold font-mono">
                    AVATAR
                  </label>
                  <div className="p-4 glass-capsule rounded-2xl flex items-center gap-4 border border-white/[0.08]">
                    {/* Live Preview */}
                    <div className="relative w-16 h-16 rounded-2xl bg-white/[0.04] border border-[#CDB486]/30 p-1 flex-shrink-0 overflow-hidden shadow-[0_4px_20px_rgba(205,180,134,0.15)] flex items-center justify-center">
                      <img
                        src={avatar || '/image/logo.png'}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>

                    {/* Upload Action */}
                    <div className="flex-1 space-y-1.5">
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
                        className="glass-btn-inflated px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] transition-transform"
                      >
                        <Upload className="w-4 h-4" />
                        <span>UPLOAD AVATAR</span>
                      </button>
                      <p className="text-[10px] text-[#8993A4] font-mono">
                        PNG, JPG, WEBP • Max 2MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="glass-btn-inflated px-6 py-2.5 text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>COMMIT IDENTITY</span>
                </button>
              </div>
            </section>

            {/* Section 2: Historical Participation Ledger */}
            <section className="glass-capsule rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#CDB486]" />
                  <h2 className="text-base font-heading font-bold tracking-wider text-[#F5F7FA] uppercase">
                    PERSONAL SETTLEMENT LEDGER
                  </h2>
                </div>
                <span className="text-[10px] text-[#8993A4] font-mono">
                  {myRounds.length} PARTICIPATIONS LOGGED
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[#8993A4] text-[10px] font-mono uppercase tracking-wider bg-white/[0.02]">
                      <th className="py-3 px-4">ROUND ID</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4">WINNER ALLOTMENT</th>
                      <th className="py-3 px-4">TICKET DRAWN</th>
                      <th className="py-3 px-4 text-right">AUDIT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {myRounds.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#8993A4]">
                          No historical engagements logged for this operator address.
                        </td>
                      </tr>
                    ) : (
                      myRounds.map((g: any, idx: number) => {
                        const isWinner =
                          g.winner?.address &&
                          g.winner.address.toLowerCase() === account?.toLowerCase();

                        return (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#F5F7FA]">{g.gameId}</td>
                            <td className="py-3.5 px-4">
                              {isWinner ? (
                                <span className="px-2.5 py-1 bg-[#CDB486]/15 text-[#CDB486] border border-[#CDB486]/30 rounded-full font-bold text-[10px] font-mono">
                                  VICTORY
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-white/[0.04] text-[#8993A4] border border-white/[0.06] rounded-full text-[10px] font-mono">
                                  PARTICIPANT
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              <span className={isWinner ? 'text-[#CDB486] font-bold drop-shadow-[0_0_8px_rgba(205, 180, 134,0.3)]' : 'text-[#8993A4]'}>
                                {g.winner?.prize ? `${g.winner.prize.toFixed(2)} USDG` : `${(g.totalPool || 0).toFixed(2)} USDG`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#8993A4] font-mono">
                              {g.winner?.winningTicket !== undefined ? `#${g.winner.winningTicket}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setVerifyTargetGameId(g.gameId);
                                  setShowVerifyModal(true);
                                }}
                                className="glass-btn-chip px-3 py-1 text-[#CDB486] text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                              >
                                VERIFY
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <ProtocolFooter />

      {/* Modals */}
      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={() => setShowWalletModal(false)}
      />

      <VerifyModal
        isOpen={showVerifyModal}
        gameId={verifyTargetGameId}
        onClose={() => {
          setShowVerifyModal(false);
          setVerifyTargetGameId(null);
        }}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 p-4 border rounded-xl max-w-sm w-full font-mono text-xs shadow-2xl ${
              toastMsg.ok
                ? 'bg-[#080C14] border-[#CDB486]/40 text-[#E2E8F0] shadow-[0_0_20px_rgba(205, 180, 134,0.15)]'
                : 'bg-[#0D1322] border-red-500/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[#CDB486]">
                {toastMsg.title}
              </span>
              <span className="text-[9px] text-[#64748B]">SYSTEM LOG</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#94A3B8]">{toastMsg.desc}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
