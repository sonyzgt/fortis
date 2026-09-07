'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/context/SocketContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSound } from '@/context/SoundContext';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { PlayerCarousel } from '@/components/jackpot/PlayerCarousel';
import { LiveDispatchDrawer } from '@/components/jackpot/LiveDispatchDrawer';
import { VerifyModal } from '@/components/cashflip/VerifyModal';
import { GameResultModal } from '@/components/cashflip/GameResultModal';
import { ProfileModal } from '@/components/cashflip/ProfileModal';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { ROBINHOOD_CHAIN_CONFIG, isGameClaimedOnChain, TOKEN_SYMBOL } from '@/lib/web3/contracts';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';
import {
  ShieldCheck,
  Zap,
  Check,
  ExternalLink,
  Coins,
  Activity,
  Users,
  Clock,
  Sparkles,
  Trophy,
  RefreshCw,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { getUserStats, getUserLevelInfo, recordUserBet } from '@/lib/levelSystem';

export default function JackpotPage() {
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
    approveTokens,
    placeBet,
    refreshBalances,
    openTermsModal,
  } = useCashFlipWeb3();

  const { playChip, playWin } = useSound();

  // User Level & XP Stats State
  const [userStats, setUserStats] = useState(() => getUserStats(account));

  // Live Dispatch Drawer State
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  // Modals state
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTargetGameId, setVerifyTargetGameId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultGame, setSelectedResultGame] = useState<any | null>(null);

  // Profile customization state
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string }>({
    name: '',
    avatar: '',
  });
  const [guestId, setGuestId] = useState<string>('');

  // Game state from socket
  const [game, setGame] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [unclaimedGames, setUnclaimedGames] = useState<any[]>([]);

  // Bet input state
  const [betAmount, setBetAmount] = useState<number>(100000);
  const [toastMsg, setToastMsg] = useState<{
    ok: boolean;
    title: string;
    desc: string;
    txHash?: string;
  } | null>(null);

  // Factory reset / reload events
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

  const levelInfo = useMemo(
    () => getUserLevelInfo(userStats.gamesPlayed, userStats.totalVolumePons),
    [userStats]
  );

  // Initialize guest identity & user profile from localStorage
  useEffect(() => {
    try {
      let gId = localStorage.getItem('kofuku_guest_id') || localStorage.getItem('cashflip_guest_id');
      if (!gId) {
        gId = 'initiate_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('kofuku_guest_id', gId);
        localStorage.setItem('cashflip_guest_id', gId);
      }
      setGuestId(gId);
    } catch (e) {}

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
      console.error('Failed to save user profile', e);
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

  // Sync smart contract address from backend
  useEffect(() => {
    const syncContracts = async () => {
      const apiBase = getApiBaseUrl();
      const ts = Date.now();
      try {
        const res = await fetch(`${apiBase}/api/contract-address?_t=${ts}`, { cache: 'no-store' });
        const data = await res.json();
        if (
          data?.contractAddress &&
          data.contractAddress.startsWith('0x') &&
          data.contractAddress.length === 42
        ) {
          localStorage.setItem('kofuku_deployed_game_contract', data.contractAddress);
          localStorage.setItem('cashflip_deployed_game_contract', data.contractAddress);
        }
      } catch (e) {
        console.warn('Could not sync contract address:', e);
      }
    };
    syncContracts();
  }, []);

  // Fetch initial game state and history
  const fetchInitial = useCallback(async () => {
    const apiBase = getApiBaseUrl();
    const ts = Date.now();
    try {
      const [stateRes, historyRes] = await Promise.all([
        fetch(`${apiBase}/api/game/current?_t=${ts}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${apiBase}/api/game/history?_t=${ts}`, { cache: 'no-store' }).catch(() => null),
      ]);

      if (stateRes && stateRes.ok) {
        const stateData = await stateRes.json();
        if (stateData && stateData.gameId) setGame(stateData);
      }

      if (historyRes && historyRes.ok) {
        const historyData = await historyRes.json();
        if (Array.isArray(historyData)) setPastGames(historyData);
      }
    } catch (e) {
      console.warn('Initial fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
    const pollInterval = setInterval(fetchInitial, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchInitial]);

  // Check unclaimed games
  useEffect(() => {
    if (!account) {
      setUnclaimedGames([]);
      return;
    }

    let isMounted = true;

    const checkUnclaimed = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/game/unclaimed/${account}?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Verify with on-chain smart contract: filter out any games already claimed on-chain
            const stillUnclaimed: any[] = [];
            for (const g of data) {
              if (!g?.gameId) continue;
              const alreadyClaimed = await isGameClaimedOnChain(g.gameId);
              if (alreadyClaimed) {
                // Auto-sync backend so it stops reporting this game
                if (socket) {
                  socket.emit('cashflip_jackpot_claim', {
                    gameId: g.gameId,
                    claimTxHash: 'on-chain',
                    address: account,
                  });
                }
                fetch(`${apiBase}/api/game/claim`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ gameId: g.gameId, claimTxHash: 'on-chain', address: account }),
                }).catch(() => {});
              } else {
                stillUnclaimed.push(g);
              }
            }
            if (isMounted) {
              setUnclaimedGames(stillUnclaimed);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to check unclaimed games:', e);
      }
    };

    checkUnclaimed();
    const interval = setInterval(checkUnclaimed, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [account, socket]);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    // Status rank — state can only advance forward, never regress
    const STATUS_RANK: Record<string, number> = { waiting: 0, open: 1, spinning: 2, complete: 3 };

    const handleGameState = (newState: any) => {
      // Must be a valid cashflip game round with gameId
      if (!newState || !newState.gameId) return;

      setGame((prev: any) => {
        if (prev && prev.gameId === newState.gameId) {
          const prevRank = STATUS_RANK[prev.status] ?? 0;
          const newRank = STATUS_RANK[newState.status] ?? 0;

          // Reject stale out-of-order broadcasts that would regress state
          if (newRank < prevRank) {
            return prev;
          }

          // Merge, but protect accumulated values from being zeroed out
          return {
            ...prev,
            ...newState,
            totalPool: Math.max(prev.totalPool ?? 0, newState.totalPool ?? 0),
            totalTickets: Math.max(prev.totalTickets ?? 0, newState.totalTickets ?? 0),
            timeRemaining: newState.timeRemaining ?? prev.timeRemaining ?? 0,
            timeLeft: newState.timeRemaining ?? prev.timeRemaining ?? 0,
          };
        }

        // Different game (new round) or no prev — accept as-is
        return {
          ...newState,
          timeRemaining: newState.timeRemaining ?? 0,
          timeLeft: newState.timeRemaining ?? 0,
        };
      });
    };

    socket.on('connect', fetchInitial);
    socket.on('cashflip_jackpot_state', handleGameState);

    const handleWinner = (payload: any) => {
      playWin();
      const completedGame = payload?.round || payload;
      if (completedGame) {
        setGame((prev: any) => ({
          ...prev,
          ...completedGame,
          status: 'complete',
          timeRemaining: 0,
          timeLeft: 0,
        }));
        setPastGames((prev) => {
          const filtered = prev.filter((g) => g.gameId !== completedGame.gameId);
          return [completedGame, ...filtered].slice(0, 30);
        });
      }

      const winObj = payload?.winner || payload;
      if (
        account &&
        winObj &&
        account.toLowerCase() === (winObj.address || winObj.playerAddress || '').toLowerCase()
      ) {
        setSelectedResultGame(completedGame || winObj);
        setShowResultModal(true);
      }
    };

    socket.on('cashflip_jackpot_winner', handleWinner);

    socket.on('cashflip_jackpot_history', (history: any[]) => {
      if (Array.isArray(history)) setPastGames(history);
    });

    socket.on('cashflip_jackpot_unclaimed', (list: any[]) => {
      if (Array.isArray(list)) setUnclaimedGames(list);
    });

    socket.on('chat_message', (msg: any) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    socket.on('chat_history', (history: any[]) => {
      if (Array.isArray(history)) setMessages(history);
    });

    return () => {
      socket.off('connect', fetchInitial);
      socket.off('cashflip_jackpot_state', handleGameState);
      socket.off('cashflip_jackpot_winner', handleWinner);
      socket.off('cashflip_jackpot_history');
      socket.off('cashflip_jackpot_unclaimed');
      socket.off('chat_message');
      socket.off('chat_history');
    };
  }, [socket, playChip, playWin, account, fetchInitial]);

  // Chat sender
  const handleChat = useCallback(
    (text: string) => {
      const clean = text?.trim();
      if (!clean || !socket) return;
      const senderId = account || guestId || 'guest_observer';
      const fallbackName = account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : `CONTENDER #${(guestId || '7777').slice(-4).toUpperCase()}`;
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

  // Transform players for carousel
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
  }, [game?.winner, game?.endTime]);

  const hasApproved = isApproved(betAmount);

  // Bet submission execution
  const handlePlaceBet = async () => {
    if (!isConnected) {
      setShowWalletModal(true);
      return;
    }

    let activeGameId = game?.gameId;
    if (!activeGameId) {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/game/current?_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const fresh = await res.json();
          if (fresh?.gameId) {
            setGame(fresh);
            activeGameId = fresh.gameId;
          }
        }
      } catch (e) {
        console.warn('Could not auto-fetch active game:', e);
      }
    }

    if (!activeGameId) {
      setToastMsg({
        ok: false,
        title: 'CONNECTING TO POOL',
        desc: 'Awaiting active round assignment.',
      });
      return;
    }

    if (betAmount < 100000) {
      setToastMsg({
        ok: false,
        title: 'TRANSMISSION ERROR',
        desc: `Stake magnitude must be at least 100,000 ${TOKEN_SYMBOL}.`,
      });
      return;
    }

    if (betAmount > usdgBalance) {
      setToastMsg({
        ok: false,
        title: 'INSUFFICIENT CAPITAL',
        desc: `Vault reserve (${usdgBalance.toFixed(2)} ${TOKEN_SYMBOL}) cannot sustain stake (${betAmount.toFixed(2)} ${TOKEN_SYMBOL}).`,
      });
      return;
    }

    const hasAgreed = localStorage.getItem('kofuku_terms_agreed') || localStorage.getItem('cashflip_terms_agreed');
    if (!hasAgreed) {
      openTermsModal();
      return;
    }

    try {
      const txHash = await placeBet(activeGameId, betAmount);
      if (txHash) {
        if (account) recordUserBet(account, betAmount);
        setUserStats(getUserStats(account));
        playChip();
        setToastMsg({
          ok: true,
          title: 'STAKE COMMITTED',
          desc: `Allocated ${betAmount.toFixed(2)} ${TOKEN_SYMBOL} into active settlement matrix.`,
          txHash,
        });
        if (socket && account) {
          socket.emit('cashflip_jackpot_bet', {
            playerAddress: account,
            playerName: userProfile?.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
            amount: betAmount,
            amountPons: betAmount,
            playerAvatar: userProfile?.avatar,
            txHash,
          });
        }
        refreshBalances();
      }
    } catch (err: any) {
      console.error('Bet submission failed:', err);
      setToastMsg({
        ok: false,
        title: 'EXECUTION FAILED',
        desc: err?.reason || err?.message || 'Smart contract rejected the transaction.',
      });
    }
  };

  const handleApprove = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }

    try {
      const txHash = await approveTokens(1000000000);
      if (txHash) {
        setToastMsg({
          ok: true,
          title: 'AUTHORIZATION GRANTED',
          desc: `Escrow contract permitted to transact ${TOKEN_SYMBOL} reserves.`,
          txHash,
        });
        refreshBalances();
      }
    } catch (e: any) {
      console.error('Approval failed:', e);
      setToastMsg({
        ok: false,
        title: 'AUTHORIZATION REJECTED',
        desc: e?.message || 'Smart contract authorization declined.',
      });
    }
  };

  const currentPool = game?.totalPool ?? 0;
  const currentPlayers = game?.players ?? [];
  const currentContendersCount = currentPlayers.length;
  const gameState = game?.status ?? game?.state ?? 'waiting';

  // Ref to hold latest endTime — lets countdown effect read it without being in the dependency array
  const endTimeRef = useRef<number>(0);
  useEffect(() => {
    // Sync ref on every render so the interval closure always has fresh endTime
    if (game?.endTime) endTimeRef.current = game.endTime;
  });

  // Client-side live countdown — only re-runs when gameState changes (NOT every server tick)
  const [liveCountdown, setLiveCountdown] = useState<number>(0);
  const [spinCountdown, setSpinCountdown] = useState<number>(10);

  useEffect(() => {
    if (gameState === 'open') {
      const getRemaining = () => {
        const et = endTimeRef.current;
        if (et && et > Date.now()) return Math.max(0, Math.ceil((et - Date.now()) / 1000));
        return 0;
      };
      setLiveCountdown(getRemaining());
      const interval = setInterval(() => {
        const rem = getRemaining();
        setLiveCountdown(rem);
        if (rem <= 0) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    } else if (gameState === 'spinning') {
      setSpinCountdown(10);
      const start = Date.now();
      const spinInterval = setInterval(() => {
        const rem = Math.max(0, Math.ceil(10 - (Date.now() - start) / 1000));
        setSpinCountdown(rem);
        if (rem <= 0) clearInterval(spinInterval);
      }, 100);
      return () => clearInterval(spinInterval);
    } else {
      setLiveCountdown(0);
      setSpinCountdown(10);
    }
  }, [gameState]); // Only gameState — no timeRemaining or endTime to avoid re-run every second

  const timeLeft = liveCountdown > 0 ? liveCountdown : (game?.timeRemaining ?? 0);

  return (
    <div className="min-h-screen bg-[#030508] text-[#F5F7FA] font-sans selection:bg-[#CDB486] selection:text-[#030508] flex flex-col relative overflow-x-hidden">
      {/* Ambient Liquid Glass Atmospheric Bubbles Background */}
      <AmbientLiquidBackground />

      {/* Header */}
      <ProtocolHeader
        currentRoute="jackpot"
        onOpenDispatch={() => setIsDispatchOpen(true)}
        dispatchCount={messages.length}
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8 relative z-10">
        {/* Section Title & Coordinates Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#CDB486] uppercase tracking-[0.25em] font-bold">
              <span>LIVE ROUND</span>
              <span>//</span>
              <span>AUTONOMOUS POOL</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#F5F7FA] flex items-center gap-2.5">
              JACKPOT ARENA
              <img src="/image/jackpot.png" alt="Jackpot Cat" className="w-8 h-8 sm:w-9 sm:h-9 object-contain inline-block drop-shadow-[0_4px_12px_rgba(205,180,134,0.3)]" />
            </h1>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-full glass-capsule border-white/10 font-sans text-xs">
            <Link
              href="/jackpot"
              className="glass-pill-active text-xs py-1.5"
            >
              JACKPOT
            </Link>
            <Link
              href="/coinflip"
              className="glass-pill-inactive text-xs py-1.5"
            >
              COINFLIP
            </Link>
            <Link
              href="/mines"
              className="glass-pill-inactive text-xs py-1.5"
            >
              MINES
            </Link>
          </div>
        </div>

        {/* Unclaimed Prize Banner */}
        <AnimatePresence>
          {unclaimedGames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-capsule p-4 sm:p-5 flex items-center justify-between flex-wrap gap-4 border-[#CDB486]/40 shadow-[0_0_30px_rgba(205, 180, 134,0.15)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl border border-[#CDB486]/60 bg-[#CDB486]/15 flex items-center justify-center text-[#CDB486] shadow-[0_0_15px_rgba(205, 180, 134,0.3)]">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-sans text-xs font-bold text-[#F5F7FA] block uppercase tracking-wider">
                    UNCLAIMED REWARD DETECTED ({unclaimedGames.length} EPOCH)
                  </span>
                  <span className="text-[11px] text-[#8993A4] font-mono">
                    Prize amount: {Number(unclaimedGames[0]?.winner?.prize ?? unclaimedGames[0]?.winner?.prizePons ?? 0).toFixed(2)} {TOKEN_SYMBOL} in Epoch #{unclaimedGames[0]?.gameId}.
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedResultGame(unclaimedGames[0]);
                  setShowResultModal(true);
                }}
                className="glass-btn-inflated px-4 py-2 text-xs flex items-center gap-1.5 shadow-lg"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>CLAIM DISPENSATION</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3-Column Telemetry Statistics (Floating Glass Capsules) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <div className="glass-capsule p-6 space-y-2 text-left">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8993A4] block font-medium">
              AGGREGATE CAPITAL IN ESCROW
            </span>
            <div className="text-3xl lg:text-4xl font-mono font-black text-[#CDB486] tracking-tight drop-shadow-[0_0_15px_rgba(205, 180, 134,0.3)]">
              {currentPool.toFixed(2)} <span className="text-sm font-sans text-white/50">{TOKEN_SYMBOL}</span>
            </div>
            <span className="text-xs font-mono text-[#8993A4] block">
              TICKETS: {(game?.totalTickets ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="glass-capsule p-6 space-y-2 text-left">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8993A4] block font-medium">
              CONTENDERS COMMITTED
            </span>
            <div className="text-3xl lg:text-4xl font-mono font-black text-[#F5F7FA] tracking-tight">
              {currentContendersCount} <span className="text-sm font-sans text-[#8993A4]">NODES</span>
            </div>
            <span className="text-xs font-mono text-[#8993A4] block">
              STATUS:{' '}
              <strong className="text-[#CDB486]">
                {gameState === 'waiting' && currentContendersCount >= 2
                  ? 'STARTING'
                  : gameState === 'open'
                  ? 'COUNTDOWN'
                  : String(gameState).toUpperCase()}
              </strong>
            </span>
          </div>

          <div className="glass-capsule p-6 space-y-2 text-left">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8993A4] block font-medium">
              EPOCH COUNTDOWN
            </span>
            <div className="text-3xl lg:text-4xl font-mono font-black text-[#F5F7FA] tracking-tight flex items-center gap-3">
              <span className={
                gameState === 'spinning'
                  ? 'text-[#CDB486] drop-shadow-[0_0_12px_rgba(205,180,134,0.6)]'
                  : gameState === 'open' && timeLeft <= 5
                  ? 'text-rose-400 animate-pulse drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : ''
              }>
                {gameState === 'waiting' && currentContendersCount === 0
                  ? 'READY'
                  : gameState === 'waiting' && currentContendersCount === 1
                  ? '—'
                  : gameState === 'waiting' && currentContendersCount >= 2
                  ? '15s'
                  : gameState === 'open'
                  ? `${timeLeft}s`
                  : gameState === 'spinning'
                  ? `${spinCountdown}s`
                  : `${timeLeft}s`}
              </span>
              {gameState === 'spinning' && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#CDB486] text-[#030508] font-bold shadow-[0_0_12px_rgba(205,180,134,0.4)]">
                  SLOW-MO
                </span>
              )}
              {gameState === 'waiting' && currentContendersCount === 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  WAITING (1/2)
                </span>
              )}
              {gameState === 'waiting' && currentContendersCount >= 2 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  STARTING
                </span>
              )}
              {gameState === 'open' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  COUNTDOWN
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-[#8993A4] block">
              {gameState === 'waiting' && currentContendersCount === 0
                ? 'WAITING FOR 1ST DEPOSIT'
                : gameState === 'waiting' && currentContendersCount === 1
                ? '1 / 2 NODES — WAITING FOR 2ND PLAYER'
                : gameState === 'waiting' && currentContendersCount >= 2
                ? '2 / 2 NODES — INITIATING COUNTDOWN...'
                : gameState === 'open'
                ? `EPOCH ID: ${game?.gameId || 'INITIALIZING'}`
                : gameState === 'spinning'
                ? 'DECELERATING WHEEL (10s SLOW-MO)'
                : `EPOCH ID: ${game?.gameId || 'INITIALIZING'}`}
            </span>
          </div>
        </div>

        {/* Carousel Astrolabe */}
        <div className="w-full">
          <PlayerCarousel
            participants={participants}
            isSpinning={gameState === 'spinning'}
            winner={carouselWinner}
          />
        </div>

        {/* Split Grid: Wager Console + Contenders Convergence Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Wager Console (7 cols) */}
          <div className="lg:col-span-7 glass-capsule p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CDB486] font-bold block">
                  CAPITAL ALLOCATION TERMINAL
                </span>
                <h3 className="font-heading text-xl font-bold uppercase text-[#F5F7FA] tracking-wide">
                  WAGER CONSOLE
                </h3>
              </div>
              <div className="text-right font-mono text-[11px]">
                <span className="text-[#8993A4] block text-[9px] uppercase tracking-wider">VAULT RESERVE</span>
                <span className="text-[#CDB486] font-bold">{usdgBalance.toFixed(2)} {TOKEN_SYMBOL}</span>
              </div>
            </div>

            {/* Quick Stake Allocation Chips */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#8993A4] block">
                PRESET STAKE INCREMENTS
              </label>
              <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                {[
                  { label: '+100k', val: 100000 },
                  { label: '+250k', val: 250000 },
                  { label: '+500k', val: 500000 },
                  { label: '+1M', val: 1000000 },
                  { label: '+2M', val: 2000000 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => setBetAmount((prev) => Number((prev + chip.val).toFixed(0)))}
                    className="glass-btn-chip py-2.5 text-[#F5F7FA] font-bold transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric Stake Input */}
            <div className="space-y-2 font-mono">
              <label className="text-[10px] uppercase tracking-wider text-[#8993A4] block">
                CUSTOM ALLOCATION MAGNITUDE ({TOKEN_SYMBOL})
              </label>
              <div className="flex items-center glass-input px-4 py-1.5 focus-within:border-[#CDB486]/60 transition-all">
                <input
                  type="number"
                  min="100000"
                  step="10000"
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  placeholder="100000"
                  className="flex-1 py-2.5 bg-transparent text-[#F5F7FA] text-base font-mono font-bold focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBetAmount(100000)}
                    className="px-2.5 py-1 text-[11px] text-[#8993A4] hover:text-[#CDB486] rounded-lg border border-white/10 hover:border-[#CDB486]/30 uppercase cursor-pointer transition-colors"
                  >
                    MIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetAmount(Number(usdgBalance.toFixed(2)))}
                    className="px-2.5 py-1 text-[11px] text-[#CDB486] hover:text-[#D8C6A5] rounded-lg border border-[#CDB486]/40 uppercase cursor-pointer transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Win Probability Estimation */}
            <div className="glass-capsule p-4 flex items-center justify-between text-xs font-mono border-white/10">
              <span className="text-[#8993A4]">ESTIMATED OUTCOME PROBABILITY:</span>
              <span className="font-bold text-[#CDB486] text-sm">
                {currentPool + betAmount > 0
                  ? ((betAmount / (currentPool + betAmount)) * 100).toFixed(1)
                  : '100.0'}
                %
              </span>
            </div>

            {/* Action Trigger Button */}
            {!isConnected ? (
              <button
                type="button"
                onClick={() => setShowWalletModal(true)}
                className="glass-btn-inflated w-full py-4 text-xs font-bold uppercase tracking-[0.15em] shadow-lg"
              >
                CONNECT WALLET TO ALLOCATE ↗
              </button>
            ) : !hasApproved ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={txState === 'approving'}
                className="glass-btn-inflated w-full py-4 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-50 shadow-lg"
              >
                {txState === 'approving' ? `AUTHORIZING ${TOKEN_SYMBOL} VAULT SPEND...` : `AUTHORIZE ${TOKEN_SYMBOL} FOR SETTLEMENT`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlaceBet}
                disabled={txState === 'betting' || gameState === 'spinning'}
                className="glass-btn-inflated w-full py-4 text-xs font-bold uppercase tracking-[0.15em] disabled:opacity-50 shadow-lg"
              >
                {txState === 'betting' ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#030508]" />
                    <span>BROADCASTING TO ROBINHOOD CHAIN...</span>
                  </span>
                ) : gameState === 'spinning' ? (
                  <span>CONVERGENCE IN PROGRESS — PLEASE WAIT</span>
                ) : (
                  <span>COMMIT STAKE TO SETTLEMENT MATRIX ↗</span>
                )}
              </button>
            )}
          </div>

          {/* Right: Contenders Convergence Nodes (5 cols) */}
          <div className="lg:col-span-5 glass-capsule p-6 space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#8993A4]">
                ACTIVE PARTICIPANTS ({currentContendersCount})
              </span>
              <span className="font-mono text-[10px] text-[#CDB486] font-bold">
                SHA-256 PRE-COMMITTED
              </span>
            </div>

            {gameState === 'waiting' && currentContendersCount === 1 && (
              <div className="w-full py-2.5 px-3 rounded-xl bg-[#CDB486]/10 border border-[#CDB486]/30 text-[#CDB486] text-xs font-mono flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#CDB486] animate-ping" />
                <span>WAITING FOR 2ND PLAYER TO JOIN...</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
              {currentPlayers.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/15 rounded-2xl text-[#8993A4] font-sans text-xs space-y-2">
                  <Activity className="w-6 h-6 opacity-40 text-[#CDB486]" />
                  <span>NO PARTICIPANTS IN CURRENT MATRIX</span>
                  <span className="text-[10px]">Be the first to deposit and initiate countdown</span>
                </div>
              ) : (
                currentPlayers.map((p: any, idx: number) => {
                  const betVal = Number(p.totalBet ?? p.amount ?? p.totalBetPons ?? 0);
                  const prob = p.odds !== undefined ? Number(p.odds).toFixed(1) : (currentPool > 0 ? ((betVal / currentPool) * 100).toFixed(1) : '100.0');
                  const isUser = account && p.address?.toLowerCase() === account.toLowerCase();

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl transition-all flex items-center justify-between font-mono text-xs ${
                        isUser
                          ? 'glass-slot-card-center'
                          : 'glass-capsule border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl border border-white/20 bg-white/5 flex-shrink-0 overflow-hidden shadow-inner">
                          <img
                            src={p.avatar || '/image/logo.png'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#F5F7FA] truncate text-xs font-sans">
                              {p.name || `${p.address?.slice(0, 6)}...`}
                            </span>
                            {isUser && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#CDB486] text-[#030508] font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8993A4] block">
                            Tickets: #{p.startTicket} – #{p.endTicket}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-[#CDB486] block text-xs">
                          {betVal.toFixed(2)} {TOKEN_SYMBOL}
                        </span>
                        <span className="text-[10px] text-[#8993A4]">{prob}% Odds</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Historical Archive Table */}
        <div className="glass-capsule p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CDB486] font-bold block">
                SETTLEMENT LEDGER
              </span>
              <h3 className="font-heading text-lg font-bold uppercase text-[#F5F7FA] tracking-wider">
                HISTORICAL ROUND AUDITS
              </h3>
            </div>
            <span className="font-mono text-[10px] text-[#8993A4]">
              SHOWING RECENT {pastGames.length} EPOCHS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#8993A4] text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">ROUND ID</th>
                  <th className="py-2.5 px-3">WINNER ADDRESS</th>
                  <th className="py-2.5 px-3">TICKET DRAWN</th>
                  <th className="py-2.5 px-3">GROSS POOL</th>
                  <th className="py-2.5 px-3">NET PRIZE (98%)</th>
                  <th className="py-2.5 px-3 text-right">AUDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {pastGames.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8993A4]">
                      No historical settlements logged in this node.
                    </td>
                  </tr>
                ) : (
                  pastGames.map((pg: any, idx: number) => {
                    const win = pg.winner;
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 text-[#F5F7FA] font-bold">{pg.gameId}</td>
                        <td className="py-3 px-3 text-[#8993A4]">
                          {win?.address ? `${win.address.slice(0, 6)}...${win.address.slice(-4)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-[#CDB486]">
                          {win?.winningTicket !== undefined ? `#${win.winningTicket}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-[#8993A4]">
                          {(Number(pg.totalPool) || 0).toFixed(2)} {TOKEN_SYMBOL}
                        </td>
                        <td className="py-3 px-3 text-[#CDB486] font-bold">
                          {((Number(pg.totalPool) || 0) * 0.98).toFixed(2)} {TOKEN_SYMBOL}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setVerifyTargetGameId(pg.gameId);
                              setShowVerifyModal(true);
                            }}
                            className="px-3 py-1 rounded-lg border border-white/15 hover:border-[#CDB486]/50 text-[#8993A4] hover:text-[#CDB486] text-[10px] uppercase tracking-wider transition-colors cursor-pointer bg-white/[0.02]"
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
        currentUserId={account || guestId}
        levelInfo={levelInfo}
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

      <VerifyModal
        isOpen={showVerifyModal}
        gameId={verifyTargetGameId}
        onClose={() => {
          setShowVerifyModal(false);
          setVerifyTargetGameId(null);
        }}
      />

      <GameResultModal
        isOpen={showResultModal}
        game={selectedResultGame}
        onClose={() => setShowResultModal(false)}
        onOpenVerify={(id) => {
          setVerifyTargetGameId(id);
          setShowVerifyModal(true);
        }}
        onClaimSuccess={(gameId, txHash) => {
          setUnclaimedGames((prev) => prev.filter((g) => g.gameId !== gameId));
          if (socket && account) {
            socket.emit('cashflip_jackpot_claim', {
              gameId,
              claimTxHash: txHash,
              address: account,
            });
          }
          const apiBase = getApiBaseUrl();
          fetch(`${apiBase}/api/game/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, claimTxHash: txHash, address: account }),
          }).catch(() => {});
          refreshBalances();
        }}
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
                ? 'bg-[#080C14] border-[#CDB486] text-[#E2E8F0] shadow-[0_0_25px_rgba(205, 180, 134,0.2)]'
                : 'bg-[#080C14] border-red-500/60 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                {toastMsg.title}
              </span>
              <span className="text-[9px] text-[#94A3B8]">SYSTEM LOG</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#94A3B8]">{toastMsg.desc}</p>
            {toastMsg.txHash && (
              <a
                href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${toastMsg.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#CDB486] hover:underline"
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
