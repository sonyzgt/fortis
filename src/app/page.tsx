'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSound } from '@/context/SoundContext';
import { useTheme } from '@/context/ThemeContext';
import { PlayerCarousel, RightWinnerSidebar } from '@/components/jackpot/PlayerCarousel';
import { LeftChatSidebar } from '@/components/jackpot/LeftChatSidebar';
import { CoinFlipArena } from '@/components/jackpot/CoinFlipArena';
import { VerifyModal } from '@/components/cashflip/VerifyModal';
import { GameResultModal } from '@/components/cashflip/GameResultModal';
import Link from 'next/link';
import { TermsModal } from '@/components/cashflip/TermsModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { ROBINHOOD_CHAIN_CONFIG, CASHFLIP_TOKEN_ADDRESS, GAME_CONTRACT_ADDRESS, getCashFlipTokenAddress } from '@/lib/web3/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Lock,
  Check,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Coins,
  Activity,
  Users,
  Clock,
  Sparkles,
  Wallet,
  LogOut,
  ChevronDown,
  Info,
  Trophy,
  Edit3,
  RefreshCw,
  Feather,
  Compass,
  CircleDot,
  Settings,
} from 'lucide-react';

import { getUserStats, getUserLevelInfo, recordUserBet } from '@/lib/levelSystem';

import { CelestialEmblem } from '@/components/ui/CelestialEmblem';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

export default function CashFlipPage() {
  const { socket } = useSocket();
  const {
    account,
    walletType,
    isConnected,
    usdgBalance,
    usdgAllowance,
    isApproved,
    txState,
    lastTxHash,
    errorMessage,
    connectWallet,
    disconnectWallet,
    approveTokens,
    placeBet,
    refreshBalances,
  } = useCashFlipWeb3();

  const { soundEnabled, toggleSound, playChip, playWin } = useSound();
  const { theme, toggleTheme } = useTheme();

  // User Level & XP Stats State
  const [userStats, setUserStats] = useState(() => getUserStats(account));

  // Listen to factory reset / reload events
  useEffect(() => {
    if (!socket) return;

    const handleForceReload = (payload: any) => {
      if (payload?.isFactoryReset && typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    socket.on('force_client_reload', handleForceReload);
    socket.on('factory_reset_complete', handleForceReload);
    return () => {
      socket.off('force_client_reload', handleForceReload);
      socket.off('factory_reset_complete', handleForceReload);
    };
  }, [socket]);

  useEffect(() => {
    setUserStats(getUserStats(account));
  }, [account]);

  const levelInfo = useMemo(() => getUserLevelInfo(userStats.gamesPlayed, userStats.totalVolumePons), [userStats]);

  // Terms of Service & Wallet Modal State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Mobile panel tab: 'chat' | 'arena' | 'history'
  const [mobileTab, setMobileTab] = useState<'chat' | 'arena' | 'history'>('arena');

  // Active game mode: 'jackpot' | 'coinflip'
  const [activeGameMode, setActiveGameMode] = useState<'jackpot' | 'coinflip'>('jackpot');

  // Coinflip Historical Victories State
  const [coinflipHistory, setCoinflipHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/coinflip/completed')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCoinflipHistory(data);
      })
      .catch((e) => console.warn('Could not load coinflip history:', e));
  }, []);

  const handleInitiateConnectWallet = (targetType: 'okx' | 'metamask' | 'rabby' | 'bitget' = 'okx') => {
    connectWallet(targetType);
  };

  const handleAcceptTerms = () => {
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
  };

  // User Profile Customization State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });

  // Load saved profile on mount
  const [guestId, setGuestId] = useState<string>('');

  useEffect(() => {
    try {
      let gId = localStorage.getItem('cashflip_guest_id');
      if (!gId) {
        gId = 'initiate_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('cashflip_guest_id', gId);
      }
      setGuestId(gId);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cashflip_user_profile');
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
      localStorage.setItem('cashflip_user_profile', JSON.stringify(updated));
      localStorage.setItem('cashflip_profile_configured', 'true');
      localStorage.setItem('cashflip_user_profile', JSON.stringify(updated));
      localStorage.setItem('cashflip_profile_configured', 'true');
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
    setToastMsg({
      ok: true,
      title: 'Registry Inscription Recorded',
      desc: `Title: "${name}"`,
    });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // CashFlip Jackpot Game State from Socket
  const [game, setGame] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultGame, setSelectedResultGame] = useState<any | null>(null);
  const [unclaimedGames, setUnclaimedGames] = useState<any[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTargetGameId, setVerifyTargetGameId] = useState<string | null>(null);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  // Bet input state
  const [betAmount, setBetAmount] = useState<number>(1);
  const [toastMsg, setToastMsg] = useState<{ ok: boolean; title: string; desc: string; txHash?: string } | null>(null);

  // Auto-dismiss floating toast notification after 4 seconds
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Auto-sync active game & token contract address from server on refresh / mount
  useEffect(() => {
    const syncContracts = async () => {
      const apiBase = getApiBaseUrl();
      const ts = Date.now();
      try {
        const res = await fetch(`${apiBase}/api/contract-address?_t=${ts}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.contractAddress && data.contractAddress.startsWith('0x') && data.contractAddress.length === 42) {
          localStorage.setItem('cashflip_deployed_game_contract', data.contractAddress);
          localStorage.setItem('cashflip_deployed_game_contract', data.contractAddress);
        } else {
          localStorage.removeItem('cashflip_deployed_game_contract');
          localStorage.removeItem('cashflip_deployed_game_contract');
        }
      } catch (e) {
        console.warn('Could not sync game contract address from server', e);
      }

      try {
        const tokenRes = await fetch(`${apiBase}/api/token-contract-address?_t=${ts}`, { cache: 'no-store' });
        const tokenData = await tokenRes.json();
        if (tokenData?.tokenAddress && tokenData.tokenAddress.startsWith('0x') && tokenData.tokenAddress.length === 42) {
          localStorage.setItem('cashflip_token_contract', tokenData.tokenAddress);
          localStorage.setItem('cashflip_token_contract', tokenData.tokenAddress);
        }
      } catch (e) {
        console.warn('Could not sync token contract address from server', e);
      }

      try {
        await refreshBalances?.();
      } catch {}
    };
    syncContracts();
  }, [refreshBalances]);

  // Request unclaimed games whenever account changes
  useEffect(() => {
    if (!socket || !account) {
      setUnclaimedGames([]);
      return;
    }
    socket.emit('cashflip_jackpot_get_unclaimed', { address: account });
  }, [socket, account]);

  // Scan pastGames for unclaimed prizes as well
  useEffect(() => {
    if (!account) return;
    const norm = account.toLowerCase();
    const unclaimed = pastGames.filter(
      (g) => g.winner && g.winner.address.toLowerCase() === norm && !g.winner.claimed
    );
    if (unclaimed.length > 0) {
      setUnclaimedGames((prev) => {
        const map = new Map<string, any>();
        prev.forEach((g) => map.set(g.gameId, g));
        unclaimed.forEach((g) => map.set(g.gameId, g));
        return Array.from(map.values());
      });
    }
  }, [pastGames, account]);

  // Socket listener for CashFlip Jackpot
  useEffect(() => {
    if (!socket) return;

    socket.on('cashflip_jackpot_state', (state: any) => {
      setGame(state);
    });

    socket.on('cashflip_jackpot_history', (history: any[]) => {
      setPastGames(history);
    });

    socket.on('cashflip_contract_updated', (data: any) => {
      if (data?.contractAddress) {
        localStorage.setItem('cashflip_deployed_game_contract', data.contractAddress);
        localStorage.setItem('cashflip_deployed_game_contract', data.contractAddress);
      }
    });

    socket.on('cashflip_token_updated', (data: any) => {
      if (data?.tokenAddress) {
        localStorage.setItem('cashflip_token_contract', data.tokenAddress);
        localStorage.setItem('cashflip_token_contract', data.tokenAddress);
      }
    });

    socket.on('force_client_reload', (data: any) => {
      setToastMsg({
        ok: true,
        title: 'Sanctuary Consecrated Anew',
        desc: data?.message || 'Updating astrological ledger...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    });

    socket.on('cashflip_jackpot_winner', (payload: any) => {
      const roundData = payload.round || payload;
      const winnerAddress = roundData?.winner?.address;
      const isWinner = account && winnerAddress && account.toLowerCase() === winnerAddress.toLowerCase();

      if (isWinner) {
        playWin();
        setSelectedResultGame(roundData);
        setShowResultModal(true);
        socket.emit('cashflip_jackpot_get_unclaimed', { address: account });
      } else {
        setShowResultModal(false);
      }
    });

    socket.on('cashflip_jackpot_unclaimed', (list: any[]) => {
      setUnclaimedGames(list || []);
    });

    socket.on('chat_history', setMessages);
    socket.on('chat_message', (m: any) => setMessages((p) => [...p.slice(-99), m]));

    socket.on('cashflip_jackpot_bet_result', (r: any) => {
      if (r.success) {
        playChip();
        setToastMsg({
          ok: true,
          title: 'Wager Inscribed Upon Sanctuary',
          desc: r.message,
          txHash: r.bet?.txHash,
        });
      } else {
        setToastMsg({
          ok: false,
          title: 'Wager Rejected by Ledger',
          desc: r.message,
        });
      }
      setTimeout(() => setToastMsg(null), 5000);
    });

    socket.on('cashflip_jackpot_claim_result', (r: any) => {
      if (r.success) {
        setUnclaimedGames((prev) => prev.filter((g) => g.gameId !== r.gameId));
      }
    });

    socket.on('coinflip_completed_games', (games: any[]) => {
      if (Array.isArray(games)) {
        setCoinflipHistory(games);
      }
    });

    socket.on('coinflip_complete', (completedGame: any) => {
      if (!completedGame?.id) return;
      setCoinflipHistory((prev) => {
        const filtered = prev.filter((g) => g.id !== completedGame.id);
        return [completedGame, ...filtered];
      });
    });

    return () => {
      [
        'cashflip_jackpot_state',
        'cashflip_jackpot_history',
        'cashflip_jackpot_winner',
        'cashflip_jackpot_unclaimed',
        'chat_history',
        'chat_message',
        'cashflip_jackpot_bet_result',
        'cashflip_jackpot_claim_result',
        'coinflip_completed_games',
        'coinflip_complete',
      ].forEach((e) => socket.off(e));
    };
  }, [socket, account, playChip, playWin]);

  const handleClaimSuccess = useCallback(
    (gameId: string, txHash: string) => {
      if (socket && account) {
        socket.emit('cashflip_jackpot_claim', { gameId, claimTxHash: txHash, address: account });
      }
      setUnclaimedGames((prev) => prev.filter((g) => g.gameId !== gameId));
      setToastMsg({
        ok: true,
        title: 'Dispensation Bestowed',
        desc: `Prize for epoch #${gameId} consecrated to your vault!`,
        txHash,
      });
      setTimeout(() => setToastMsg(null), 5000);
    },
    [socket, account]
  );

  // Transform players into carousel participants format
  const participants = useMemo(() => {
    if (!game || !game.players) return [];
    return game.players.map((p: any) => ({
      playerId: p.address,
      playerName: p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`,
      playerAvatar: p.avatar || '/image/logo.png',
      walletAddress: p.address,
      ticketCount: p.ticketCount,
      totalSpent: p.totalBet ?? p.totalBetPons ?? 0,
      odds: p.odds,
    }));
  }, [game]);

  // Stable carousel winner object
  const carouselWinner = useMemo(() => {
    if (!game?.winner) return null;
    return {
      playerId: game.winner.address,
      playerName: game.winner.name,
      playerAvatar: game.winner.avatar || '/image/logo.png',
      walletAddress: game.winner.address,
      ticketCount: game.winner.ticketCount,
      potWon: game.winner.prize ?? game.winner.prizePons ?? 0,
      odds: game.winner.odds,
      winningTicket: game.winner.winningTicket,
      timestamp: game.endTime || 0,
    };
  }, [game?.winner?.address, game?.winner?.winningTicket, game?.winner?.prize, game?.winner?.prizePons, game?.endTime]);

  const hasApproved = isApproved(betAmount);

  // Quick Bet presets (USDG)
  const BET_PRESETS = [0.1, 0.5, 1, 5, 10];

  // Handle Approve Token
  const handleApprove = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }

    try {
      const tx = await approveTokens(betAmount);
      if (tx) {
        setToastMsg({
          ok: true,
          title: 'Covenant Consecrated',
          desc: `USDG token allowance granted to the sanctuary smart contract.`,
          txHash: tx,
        });
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e: any) {
      const isUserRejected =
        e?.code === 4001 ||
        e?.code === 'ACTION_REJECTED' ||
        e?.message?.includes('user rejected') ||
        e?.message?.includes('User denied');
      setToastMsg({
        ok: false,
        title: isUserRejected ? 'Sanctuary Consecration Cancelled' : 'Approval Failed',
        desc: isUserRejected
          ? 'Token approval was cancelled in wallet.'
          : e?.reason || e?.message || 'Failed to approve USDG tokens.',
      });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  // Handle Place Bet
  const handleBet = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }
    if (!game) return;

    if (betAmount < 0.1) {
      setToastMsg({
        ok: false,
        title: 'Minimum Wager Not Met',
        desc: 'The minimum wager is 0.1 USDG.',
      });
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    try {
      const tx = await placeBet(game.gameId, betAmount);
      if (tx) {
        const newStats = recordUserBet(account, betAmount);
        setUserStats(newStats);

        socket?.emit('cashflip_jackpot_bet', {
          playerAddress: account,
          playerName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
          playerAvatar: userProfile.avatar || '/image/logo.png',
          amount: betAmount,
          amountPons: betAmount,
          txHash: tx,
        });
      }
    } catch (e: any) {
      setToastMsg({ ok: false, title: 'Wager Cancelled', desc: e?.message || 'Failed to place wager' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleChat = useCallback(
    (text: string) => {
      const clean = text?.trim();
      if (!clean) return;
      if (!socket) {
        setToastMsg({ ok: false, title: 'Dispatch Delayed', desc: 'Connecting to observatory chronicles...' });
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }
      const senderId = account || guestId || 'guest_observer';
      const fallbackName = account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : `Initiate #${(guestId || '7777').slice(-4).toUpperCase()}`;
      const senderName = userProfile.name?.trim() || fallbackName;
      const senderAvatar = userProfile.avatar || '/image/logo.png';

      socket.emit('send_chat', {
        senderId,
        senderName,
        senderAvatar,
        text: clean,
      });
    },
    [socket, account, guestId, userProfile]
  );

  const timeRemaining = game?.timeRemaining ?? 15;
  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const ss = String(timeRemaining % 60).padStart(2, '0');

  const displayName = userProfile.name || (account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Initiate');
  const displayAvatar = userProfile.avatar || '/image/logo.png';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#E8DFD1] text-[#171513] font-serif select-none">
      {/* ═══════════ EDITORIAL MASTHEAD ═══════════ */}
      <header className="sticky top-0 z-50 flex-shrink-0 h-[64px] sm:h-[76px] flex items-center justify-between px-4 lg:px-6 bg-[#E8DFD1] border-b border-[#171513]/20 shadow-sm relative">
        {/* Left: Vintage Celestial Brand Identity */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 border border-[#9E8055] p-1 bg-[#F4EFE6] flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner">
              <CelestialEmblem className="w-full h-full text-[#171513]" />
            </div>
            <div className="leading-tight">
              <span className="text-[9px] tracking-[0.3em] font-serif uppercase text-[#9E8055] block">
                L'Observatoire Céleste
              </span>
              <span className="text-base sm:text-lg font-serif tracking-[0.18em] font-semibold text-[#171513]">
                CASHFLIP
              </span>
            </div>
          </Link>

          {/* Desktop Token Ledger Badge */}
          <div className="hidden md:flex items-center gap-2 pl-4 ml-3 border-l border-[#171513]/15">
            <a
              href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/token/${getCashFlipTokenAddress() || CASHFLIP_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F4EFE6] border border-[#171513]/20 text-[10px] font-mono text-[#171513]/80 hover:text-[#171513] hover:border-[#9E8055] transition-colors"
              title="Inspect USDG Settlement Contract"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#9E8055]" />
              <span className="text-[#9E8055] font-serif uppercase text-[9px] tracking-wider">USDG:</span>
              <span className="font-semibold">
                {getCashFlipTokenAddress() ? `${getCashFlipTokenAddress().slice(0, 6)}...${getCashFlipTokenAddress().slice(-4)}` : 'Robinhood'}
              </span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Right: Sound Toggle, Wallet Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className="w-8 h-8 sm:w-9 sm:h-9 border border-[#171513]/20 bg-[#F4EFE6] hover:bg-[#E8DFD1] text-[#171513] flex items-center justify-center transition-colors shadow-sm"
            title={soundEnabled ? 'Silence Chimes' : 'Enable Chimes'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9E8055]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#171513]/40" />
            )}
          </button>

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

          {/* Connected Wallet or Connect Button */}
          {isConnected && account ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#F4EFE6] border border-[#171513]/25 text-[#171513] hover:border-[#9E8055] transition-colors shadow-sm"
              >
                <div className="w-6 h-6 border border-[#9E8055]/60 bg-[#E8DFD1] p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-serif font-semibold truncate max-w-[100px] leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[10px] font-mono text-[#9E8055] font-medium leading-none">
                    {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG
                  </p>
                </div>
                <ChevronDown className={`w-3 h-3 text-[#171513]/50 transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showWalletDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowWalletDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0 }}
                      className="editorial-frame w-72 p-4 bg-[#E8DFD1] text-[#171513] shadow-[0_15px_40px_rgba(0,0,0,0.35)] z-50 space-y-3"
                    >
                      <BookplateCorner />
                      <div className="flex items-center gap-3 p-2.5 bg-[#F4EFE6] border border-[#171513]/15">
                        <img src={displayAvatar} alt="" className="w-10 h-10 border border-[#9E8055] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-serif font-semibold text-[#171513] truncate">{displayName}</p>
                          <p className="text-[10px] font-mono text-[#171513]/60 truncate">{account}</p>
                        </div>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setShowWalletDropdown(false)}
                        className="w-full py-2.5 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] text-xs font-serif tracking-wider uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#9E8055]" />
                        <span>ACCOUNT & SETTINGS</span>
                      </Link>

                      <div className="p-2.5 bg-[#F4EFE6] border border-[#171513]/15 flex justify-between items-center text-[11px] font-serif">
                        <span className="text-[#171513]/60">Saldo Wallet:</span>
                        <span className="font-mono text-[#9E8055] font-semibold">
                          {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          disconnectWallet();
                          setShowWalletDropdown(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-red-800/30 hover:bg-red-800 hover:text-[#F4EFE6] text-xs font-serif tracking-wider uppercase text-red-800 transition-colors shadow-sm"
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
              onClick={() => setShowWalletModal(true)}
              className="px-4 py-2 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Wallet className="w-3.5 h-3.5 text-[#9E8055]" />
              <span className="hidden sm:inline">CONSULT CODEX</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
        </div>
      </header>

      {/* ═══════════ MAIN 3-COLUMN LAYOUT ═══════════ */}
      <div className="flex-1 flex overflow-hidden min-h-0 pb-[56px] lg:pb-0">
        {/* Left: Chat Feed (Chronicles) */}
        <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-auto h-full`}>
          <LeftChatSidebar
            messages={messages}
            onSend={handleChat}
            currentUserId={account || guestId || undefined}
            levelInfo={levelInfo}
          />
        </div>

        {/* Center: Main Arena (The Celestial Orbit) */}
        <div className={`${mobileTab === 'arena' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0 h-full`}>
          <main className="flex-1 overflow-y-auto min-w-0 bg-transparent p-0 flex flex-col justify-between">
            <div className="px-4 lg:px-6 pt-4">
              <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-4">
                {/* ── UNCLAIMED DISPENSATION BANNER ── */}
                <AnimatePresence>
                  {unclaimedGames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      className="editorial-frame p-4 bg-[#F4EFE6] border border-[#9E8055] flex items-center justify-between flex-wrap gap-3 shadow-md"
                    >
                      <BookplateCorner />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-[#9E8055] bg-[#E8DFD1] flex items-center justify-center text-[#9E8055] flex-shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif font-semibold tracking-wider text-[#171513] uppercase">
                              ✦ UNCLAIMED CELESTIAL DISPENSATION
                            </span>
                            <span className="px-2 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px] font-mono uppercase tracking-wider">
                              {unclaimedGames.length} Epoch(s)
                            </span>
                          </div>
                          <p className="text-[11px] text-[#171513]/70 font-serif mt-0.5">
                            You triumphed with{' '}
                            <strong className="text-[#171513]">
                              {unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} USDG
                            </strong>{' '}
                            in Epoch #{unclaimedGames[0]?.gameId}. Inscribe withdrawal to your vault.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedResultGame(unclaimedGames[0]);
                          setShowResultModal(true);
                        }}
                        className="px-4 py-2 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] text-xs font-serif tracking-widest uppercase border border-[#9E8055]/50 flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#9E8055]" />
                        <span>Claim Dispensation ({unclaimedGames[0]?.winner?.prizePons?.toLocaleString()} USDG)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── GAME SANCTUM MODE NAVIGATION ── */}
                <div className="flex items-center justify-between border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 pb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveGameMode('jackpot')}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-serif tracking-wider sm:tracking-widest uppercase transition-all border ${
                        activeGameMode === 'jackpot'
                          ? 'border-[#9E8055] bg-[#171513] text-[#F4EFE6] dark:bg-[#BCA172] dark:text-[#121110] font-bold shadow-sm'
                          : 'border-[#171513]/20 dark:border-[#E8DFD1]/20 bg-[#F4EFE6] dark:bg-[#1C1A17] text-[#171513]/70 dark:text-[#E8DFD1]/70 hover:border-[#9E8055]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#9E8055] dark:text-[#121110]" />
                      <span>CELESTIAL ORBIT (JACKPOT)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveGameMode('coinflip')}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-serif tracking-wider sm:tracking-widest uppercase transition-all border ${
                        activeGameMode === 'coinflip'
                          ? 'border-[#9E8055] bg-[#171513] text-[#F4EFE6] dark:bg-[#BCA172] dark:text-[#121110] font-bold shadow-sm'
                          : 'border-[#171513]/20 dark:border-[#E8DFD1]/20 bg-[#F4EFE6] dark:bg-[#1C1A17] text-[#171513]/70 dark:text-[#E8DFD1]/70 hover:border-[#9E8055]'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5 text-[#9E8055] dark:text-[#121110]" />
                      <span>DUALIS FORTUNA (COIN FLIP)</span>
                    </button>
                  </div>

                  <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono text-[#9E8055] tracking-widest uppercase">
                    ✦ PROVABLY FAIR
                  </span>
                </div>

                {activeGameMode === 'coinflip' ? (
                  <CoinFlipArena
                    account={account}
                    usdgBalance={usdgBalance}
                    userProfile={userProfile}
                    onOpenWalletModal={() => setShowWalletModal(true)}
                    onShowToast={(msg, ok) =>
                      setToastMsg({
                        ok: !!ok,
                        title: ok ? 'Observation Recorded' : 'Duel Notice',
                        desc: msg,
                      })
                    }
                  />
                ) : (
                  <>
                    {/* ── 1. THE TRIAD OF MEASURE (COUNTER INSTRUMENTS) ── */}
                    <div className="grid grid-cols-3 gap-3">
                  {/* Prize Pool Display */}
                  <div className="editorial-card p-3.5 sm:p-4 bg-[#F4EFE6] text-center relative">
                    <span className="text-[9px] font-serif uppercase tracking-[0.25em] text-[#9E8055] block mb-1">
                      Celestial Sanctum Pool
                    </span>
                    <div className="text-xl sm:text-2xl font-serif font-semibold text-[#171513] flex items-center justify-center gap-1.5">
                      <span>{(game?.totalPool || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      <span className="text-xs font-mono text-[#9E8055] tracking-normal">USDG</span>
                    </div>
                    <span className="text-[9px] font-serif text-[#171513]/60 block mt-1">
                      98% Victor • 2% Sanctuary Tithe
                    </span>
                  </div>

                  {/* Observers Meter */}
                  <div className="editorial-card p-3.5 sm:p-4 bg-[#F4EFE6] text-center relative">
                    <span className="text-[9px] font-serif uppercase tracking-[0.25em] text-[#9E8055] block mb-1">
                      Contenders Inscribed
                    </span>
                    <div className="text-xl sm:text-2xl font-serif font-semibold text-[#171513] flex items-center justify-center gap-1">
                      <span>{game?.totalPlayers || 0}</span>
                    </div>
                    <span className="text-[9px] font-serif text-[#171513]/60 block mt-1">
                      {game?.status === 'waiting' ? 'Awaiting 2 Contenders' : 'Epoch Under Observation'}
                    </span>
                  </div>

                  {/* Chronometer */}
                  <div className="editorial-card p-3.5 sm:p-4 bg-[#F4EFE6] text-center relative">
                    <span className="text-[9px] font-serif uppercase tracking-[0.25em] text-[#9E8055] block mb-1">
                      Astrological Chronometer
                    </span>
                    <div
                      className={`text-xl sm:text-2xl font-mono font-bold tracking-tight ${
                        game?.status === 'waiting'
                          ? 'text-[#171513]/40'
                          : timeRemaining <= 5
                          ? 'text-red-800 animate-pulse'
                          : 'text-[#171513]'
                      }`}
                    >
                      {game?.status === 'waiting' ? '— : —' : `${mm} : ${ss}`}
                    </div>
                    <span className="text-[9px] font-serif text-[#171513]/60 block mt-1">
                      15s Rapid Convergence
                    </span>
                  </div>
                </div>

                {/* ── 2. CELESTIAL WHEEL / ASTROLABE REEL ── */}
                <PlayerCarousel
                  participants={participants}
                  isSpinning={game?.status === 'spinning'}
                  winner={carouselWinner}
                />

                {/* ── 3. WAGER INSCRIPTION LEDGER (BETTING OPERATOR PANEL) ── */}
                <div className="editorial-frame p-5 sm:p-6 bg-[#F4EFE6] text-[#171513] space-y-4 shadow-sm relative">
                  <BookplateCorner />

                  <div className="flex items-center justify-between border-b border-[#171513]/15 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Feather className="w-3.5 h-3.5 text-[#9E8055]" />
                      <span className="text-xs font-serif font-semibold tracking-wider text-[#171513] uppercase">
                        INSCRIPTION OF WAGER (USDG)
                      </span>
                    </div>
                    <div className="text-[10px] font-serif text-[#171513]/70">
                      Vault Reserves:{' '}
                      <span className="font-mono text-[#9E8055] font-semibold">
                        {usdgBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG
                      </span>
                    </div>
                  </div>

                  {/* Tactile Preset Buttons */}
                  <div className="grid grid-cols-5 gap-2">
                    {BET_PRESETS.map((preset) => {
                      const isActive = betAmount === preset;
                      return (
                        <button
                          key={preset}
                          onClick={() => setBetAmount(preset)}
                          className={`py-2 px-2 text-center text-xs font-serif tracking-wider border transition-colors ${
                            isActive
                              ? 'bg-[#171513] text-[#F4EFE6] border-[#171513] font-semibold'
                              : 'bg-[#E8DFD1] text-[#171513] border-[#171513]/20 hover:border-[#171513]/50'
                          }`}
                        >
                          {preset} USDG
                        </button>
                      );
                    })}
                  </div>

                  {/* Action Button */}
                  <div className="w-full">
                    {!isConnected ? (
                      <button
                        onClick={() => setShowWalletModal(true)}
                        className="w-full py-3 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        <Wallet className="w-3.5 h-3.5 text-[#9E8055]" />
                        <span>CONSULT CODEX</span>
                      </button>
                    ) : !hasApproved ? (
                      <button
                        onClick={handleApprove}
                        disabled={txState === 'approving'}
                        className="w-full py-3 bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] font-serif text-xs tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-colors shadow-sm"
                      >
                        {txState === 'approving' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9E8055]" />
                            <span>CONSECRATING...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-[#9E8055]" />
                            <span>CONSECRATE USDG</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleBet}
                        disabled={
                          txState === 'betting' ||
                          (game?.status !== 'waiting' && game?.status !== 'open') ||
                          usdgBalance < betAmount
                        }
                        className={`w-full py-3 font-serif text-xs tracking-widest uppercase border transition-colors flex items-center justify-center gap-2 shadow-sm ${
                          (game?.status === 'waiting' || game?.status === 'open') && usdgBalance >= betAmount
                            ? 'bg-[#171513] hover:bg-[#25221e] text-[#F4EFE6] border-[#9E8055]/50 cursor-pointer'
                            : 'bg-[#171513]/10 text-[#171513]/40 border-transparent cursor-not-allowed'
                        }`}
                      >
                        {txState === 'betting' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9E8055]" />
                            <span>INSCRIBING...</span>
                          </>
                        ) : game?.status === 'spinning' ? (
                          'WHEEL CONVERGING...'
                        ) : (
                          <>
                            <Feather className="w-3.5 h-3.5 text-[#9E8055]" />
                            <span>INSCRIBE WAGER ({betAmount} USDG)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Approval Information Note */}
                  {!hasApproved && isConnected && (
                    <div className="flex items-center gap-2 text-[10px] font-serif text-[#171513]/70 p-2 bg-[#E8DFD1] border border-[#171513]/15">
                      <Info className="w-3 h-3 text-[#9E8055] flex-shrink-0" />
                      <span>
                        Robinhood ERC-20 canon mandates a singular token consecration before the smart contract sanctuary accepts USDG wagers.
                      </span>
                    </div>
                  )}
                </div>

                {/* ── 4. REGISTRY OF CONTENDERS (PRINTED LEDGER) ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F4EFE6] border border-[#171513]/20 text-xs font-serif font-semibold text-[#171513]">
                        <Users className="w-3.5 h-3.5 text-[#9E8055]" />
                        <span>{game?.players?.length || 0} CONTENDERS INSCRIBED</span>
                      </div>

                      <button
                        onClick={() => {
                          setVerifyTargetGameId(game?.gameId || null);
                          setShowVerifyModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#F4EFE6] hover:bg-[#E8DFD1] border border-[#171513]/20 text-[11px] font-serif text-[#171513] transition-colors"
                        title="Inspect Mathematical Provability"
                      >
                        <ShieldCheck className="w-3 h-3 text-[#9E8055]" />
                        <span>Mathematical Proof Audit</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </div>

                    <div className="text-xs font-serif text-[#171513]/70">
                      EPOCH NONCE:{' '}
                      <span className="font-mono font-semibold text-[#171513]">
                        #{game?.gameId?.replace(/^CASHFLIP-/, '') || '371667'}
                      </span>
                    </div>
                  </div>

                  {/* Contenders List */}
                  <div className="space-y-2">
                    {!game?.players || game.players.length === 0 ? (
                      <div className="text-center py-10 bg-[#F4EFE6] border border-[#171513]/15 text-xs text-[#171513]/50 font-serif italic">
                        Sanctum pool is currently silent. Inscribe the premier wager to initiate the epoch.
                      </div>
                    ) : (
                      game.players.map((p: any) => {
                        const isMe = account && p.address.toLowerCase() === account.toLowerCase();
                        return (
                          <div
                            key={p.address}
                            className={`editorial-card p-3 sm:p-3.5 bg-[#F4EFE6] flex items-center justify-between transition-all ${
                              isMe ? 'border-[#9E8055] ring-1 ring-[#9E8055]' : 'border-[#171513]/15'
                            }`}
                          >
                            {/* Left: Portrait, Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 border border-[#9E8055] bg-[#E8DFD1] p-0.5 flex-shrink-0">
                                <img
                                  src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.address}`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-xs sm:text-sm font-serif font-semibold text-[#171513] truncate">
                                  {p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                                  {isMe && <span className="text-[#9E8055] text-xs ml-1 font-serif">(You)</span>}
                                </p>
                                <span className="text-[9px] font-mono text-[#171513]/50 block">
                                  {p.address.slice(0, 8)}...{p.address.slice(-6)}
                                </span>
                              </div>
                            </div>

                            {/* Middle: Wager Amount */}
                            <div className="text-right px-3">
                              <div className="text-sm sm:text-base font-serif font-semibold text-[#171513]">
                                {(p.totalBet ?? p.totalBetPons ?? 0).toLocaleString()}
                              </div>
                              <div className="text-[9px] font-mono text-[#9E8055]">USDG</div>
                            </div>

                            {/* Right: Chance */}
                            <div className="text-right pl-3 sm:pl-4 border-l border-[#171513]/15 min-w-[70px]">
                              <span className="text-[9px] font-serif uppercase tracking-widest text-[#171513]/50 block">
                                Odds
                              </span>
                      <span className="text-sm sm:text-base font-mono font-semibold text-[#171513]">
                                {p.odds}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

            {/* ═══════════ EDITORIAL COLOPHON (FOOTER) ═══════════ */}
            <footer className="w-full bg-[#DDD2C1] dark:bg-[#12110F] border-t border-[#171513]/20 dark:border-[#E8DFD1]/15 mt-16 pt-8 pb-20 lg:pb-8 px-4 lg:px-6 select-none font-serif text-xs transition-colors">
              <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-5">
                <CelestialFlourish />

                <div className="editorial-card p-5 sm:p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/20 dark:border-[#9E8055]/30 flex flex-col md:flex-row items-center gap-5 relative transition-colors shadow-sm">
                  <BookplateCorner />
                  <div className="w-16 h-16 border border-[#9E8055] bg-[#E8DFD1] dark:bg-[#12110F] p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <CelestialEmblem className="w-full h-full text-[#171513]" />
                  </div>
                  <div className="space-y-2 text-[#171513]/80 dark:text-[#E8DFD1]/80 text-[11px] leading-relaxed text-center md:text-left">
                    <p>
                      <strong className="text-[#171513] dark:text-[#E8DFD1] font-semibold">CASHFLIP L'OBSERVATOIRE</strong> — A decentralized cryptographic sanctum governed by the smart contracts of Robinhood Chain and settled in USDG. CashFlip provides trustless escrow custody, high-stakes coinflip duels, and provably fair outcome dispersion verified through SHA-256 pre-commitments.
                    </p>
                    <p className="text-[10px] text-[#171513]/60 dark:text-[#E8DFD1]/50 italic">
                      Entry to this observatory requires assent to the Canon of Conduct and Age Qualifications.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-[11px] text-[#171513]/60 dark:text-[#E8DFD1]/60 font-serif border-t border-[#171513]/15 dark:border-[#E8DFD1]/10">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span>© MMXXVI CashFlip Observatory</span>
                    <span className="opacity-40">•</span>
                    <Link href="/terms" className="text-[#9E8055] dark:text-[#DFC493] hover:underline font-semibold">
                      Canon of Terms
                    </Link>
                    <span className="opacity-40">•</span>
                    <Link href="/privacy" className="text-[#9E8055] dark:text-[#DFC493] hover:underline font-semibold">
                      Privacy Covenant
                    </Link>
                  </div>

                  <a
                    href="https://x.com/cashflipdotfun"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-1 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] dark:hover:border-[#DFC493] text-[#171513] dark:text-[#E8DFD1] text-[10px] tracking-wider uppercase transition-colors"
                  >
                    <span>Dispatch: @cashflipdotfun</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#9E8055] dark:text-[#DFC493]" />
                  </a>
                </div>
              </div>
            </footer>
          </main>
        </div>

        {/* Right: Round History Sidebar (Archives of Fortune) */}
        <div
          className={`lg:block ${
            mobileTab === 'history' ? 'fixed inset-0 z-40 bg-[#E8DFD1] dark:bg-[#141311] pt-16 pb-16' : 'hidden'
          }`}
        >
          <RightWinnerSidebar
            pastRounds={pastGames.map((g) => ({
              roundNumber: g.nonce,
              winner: {
                playerId: g.winner?.address || '',
                playerName: g.winner?.name || '',
                playerAvatar: g.winner?.avatar,
                walletAddress: g.winner?.address,
                ticketCount: g.winner?.ticketCount || 0,
                potWon: g.winner?.prizePons || 0,
                odds: g.winner?.odds || 0,
                winningTicket: g.winner?.winningTicket || 0,
                timestamp: g.endTime,
              },
              totalPot: g.totalPool,
              totalPlayers: g.totalPlayers,
              timestamp: g.endTime,
            }))}
            coinflipGames={coinflipHistory}
          />
        </div>
      </div>

      {/* ═══════════ MOBILE NAVIGATION TABS ═══════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-stretch h-14 bg-[#E8DFD1] dark:bg-[#141311] border-t border-[#171513]/20 dark:border-[#E8DFD1]/15 shadow-lg">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-serif tracking-widest uppercase transition-colors ${
            mobileTab === 'chat' ? 'text-[#171513] dark:text-[#E8DFD1] bg-[#DDD2C1] dark:bg-[#201E1B] font-semibold' : 'text-[#171513]/50 dark:text-[#E8DFD1]/50'
          }`}
        >
          <Feather className="w-4 h-4 text-[#9E8055] dark:text-[#DFC493]" />
          <span>Chronicles</span>
        </button>
        <button
          onClick={() => setMobileTab('arena')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-serif tracking-widest uppercase transition-colors ${
            mobileTab === 'arena' ? 'text-[#171513] dark:text-[#E8DFD1] bg-[#DDD2C1] dark:bg-[#201E1B] font-semibold' : 'text-[#171513]/50 dark:text-[#E8DFD1]/50'
          }`}
        >
          <Compass className="w-4 h-4 text-[#9E8055] dark:text-[#DFC493]" />
          <span>Orbit</span>
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-serif tracking-widest uppercase transition-colors ${
            mobileTab === 'history' ? 'text-[#171513] dark:text-[#E8DFD1] bg-[#DDD2C1] dark:bg-[#201E1B] font-semibold' : 'text-[#171513]/50 dark:text-[#E8DFD1]/50'
          }`}
        >
          <CircleDot className="w-4 h-4 text-[#9E8055] dark:text-[#DFC493]" />
          <span>Archives</span>
        </button>
      </nav>

      {/* ── FLOATING NOTIFICATION POPUP ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            className={`editorial-frame fixed top-20 right-6 z-50 flex items-start gap-3 px-4 py-3 bg-[#E8DFD1] text-[#171513] shadow-[0_15px_40px_rgba(0,0,0,0.3)] border select-none max-w-sm ${
              toastMsg.ok ? 'border-[#9E8055]' : 'border-red-800'
            }`}
          >
            <div
              className={`w-7 h-7 flex items-center justify-center flex-shrink-0 border mt-0.5 ${
                toastMsg.ok ? 'border-[#9E8055] text-[#9E8055] bg-[#F4EFE6]' : 'border-red-800 text-red-800 bg-red-100'
              }`}
            >
              {toastMsg.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-serif font-semibold tracking-wider text-[#171513]">
                {toastMsg.title}
              </p>
              <p className="text-[11px] text-[#171513]/70 font-serif mt-0.5 leading-snug">{toastMsg.desc}</p>
              {toastMsg.txHash && (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${toastMsg.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#9E8055] underline font-serif mt-0.5"
                >
                  <span>Inspect on Robinhood Blockscout</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="p-1 -mr-1 text-[#171513]/40 hover:text-[#171513] transition-colors"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALS ── */}
      <GameResultModal
        isOpen={showResultModal}
        game={selectedResultGame || game}
        onClose={() => {
          setShowResultModal(false);
          setSelectedResultGame(null);
        }}
        onOpenVerify={(id) => {
          setVerifyTargetGameId(id);
          setShowVerifyModal(true);
        }}
        onClaimSuccess={handleClaimSuccess}
      />

      <VerifyModal
        isOpen={showVerifyModal}
        gameId={verifyTargetGameId}
        onClose={() => setShowVerifyModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        account={account}
        currentName={userProfile.name}
        currentAvatar={userProfile.avatar}
        onSaveProfile={handleSaveProfile}
      />

      <TermsModal
        isOpen={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />

      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(type) => connectWallet(type)}
      />
    </div>
  );
}
