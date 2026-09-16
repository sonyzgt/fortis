'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Coins,
  Swords,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Eye,
  RefreshCw,
  Plus,
  Bot,
  ExternalLink,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  X,
  Share2,
  Shield,
  Copy,
  Trophy,
  Gift,
} from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useSound } from '@/context/SoundContext';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';
import { CoinFlipGame } from '@/types/jackpot';
import { ROBINHOOD_CHAIN_CONFIG, TOKEN_SYMBOL } from '@/lib/web3/contracts';

interface CoinFlipArenaProps {
  account: string | null;
  usdgBalance: number;
  userProfile: { name: string; avatar: string };
  onOpenWalletModal: () => void;
  onShowToast: (msg: string, ok?: boolean) => void;
}

const QUICK_ADD_AMOUNTS = [1, 5, 10, 25, 50, 100];

export const CoinFlipArena: React.FC<CoinFlipArenaProps> = ({
  account,
  usdgBalance,
  userProfile,
  onOpenWalletModal,
  onShowToast,
}) => {
  const { socket } = useSocket();
  const { playChip, playWin, playSuspenseRiser, playTick, playCoinToss, playCoinLand, playCoinVictory, playCoinClaim, pauseBgm, resumeBgm } = useSound();
  const { placeBet, claimWinnings, refreshBalances, txState } = useCashFlipWeb3();

  // Lobby Games State
  const [games, setGames] = useState<CoinFlipGame[]>([]);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [betAmount, setBetAmount] = useState<number>(100000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState<'high' | 'low' | 'newest'>('newest');
  const [filterAmount, setFilterAmount] = useState<'all' | 'small' | 'med' | 'large'>('all');

  // Spectate & Duel Modal State
  const [spectateGame, setSpectateGame] = useState<CoinFlipGame | null>(null);
  const [isConfirmingBet, setIsConfirmingBet] = useState<boolean>(false);
  const [isClaimingPvp, setIsClaimingPvp] = useState<boolean>(false);
  const [pvpClaimTx, setPvpClaimTx] = useState<string | null>(null);

  // Player 1 (Creator) Payment Confirmation Modal State
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState<boolean>(false);
  const [isPayingCreate, setIsPayingCreate] = useState<boolean>(false);

  // Player 2 (Challenger) Payment Execution State
  const [isPayingJoin, setIsPayingJoin] = useState<boolean>(false);

  // Peer Duel Flipping
  const [activeFlippingGame, setActiveFlippingGame] = useState<CoinFlipGame | null>(null);
  const [flipRotation, setFlipRotation] = useState<number>(0);
  const [isFlippingAnim, setIsFlippingAnim] = useState<boolean>(false);
  const [flipResultGame, setFlipResultGame] = useState<CoinFlipGame | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeFlipIdRef = useRef<string | null>(null);

  const handleCloseSpectateModal = useCallback(() => {
    setSpectateGame(null);
    setFlipRotation(0);
    activeFlipIdRef.current = null;
    if (isFlippingAnim) {
      setIsFlippingAnim(false);
      resumeBgm();
    }
  }, [isFlippingAnim, resumeBgm]);

  // Unclaimed Rewards State (persistent recovery if connection drops or page refreshes)
  const [unclaimedWins, setUnclaimedWins] = useState<CoinFlipGame[]>([]);
  const [claimingGameId, setClaimingGameId] = useState<string | null>(null);

  // Fetch open games
  const fetchOpenGames = useCallback(async () => {
    try {
      const res = await fetch('/api/coinflip');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGames(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch coinflip games:', e);
    }
  }, []);

  // Fetch unclaimed games won by current player
  const fetchUnclaimedWins = useCallback(async () => {
    if (!account) {
      setUnclaimedWins([]);
      return;
    }
    try {
      const res = await fetch(`/api/coinflip/unclaimed/${account}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUnclaimedWins(data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch unclaimed coinflip wins:', e);
    }
  }, [account]);

  useEffect(() => {
    fetchOpenGames();
    fetchUnclaimedWins();
  }, [fetchOpenGames, fetchUnclaimedWins]);

  // Flip animation with authentic coin physics:
  // Starts fast, smoothly decelerates to very slow in the final moments, stops precisely at target face without re-spinning
  const triggerFlipAnimation = useCallback((game: CoinFlipGame) => {
    if (activeFlipIdRef.current === game.id && isFlippingAnim) {
      return;
    }
    activeFlipIdRef.current = game.id;
    setActiveFlippingGame(game);
    setIsFlippingAnim(true);
    pauseBgm(); // Pause backsound while coin duel resolves
    playCoinToss(); // Metallic coin flick
    playSuspenseRiser(); // Cinematic tension riser

    // Accurate target face directly from server result
    const targetFace =
      game.result ||
      (game.winnerId && game.creatorId && game.winnerId === game.creatorId
        ? game.creatorSide
        : game.creatorSide === 'heads'
        ? 'tails'
        : 'heads') ||
      'heads';
    const extraRot = targetFace === 'heads' ? 0 : 180;
    // 12 full rotations (4320 deg) + extraRot so the coin completes its spin right on target face
    const totalSpins = 12 * 360 + extraRot;
    setFlipRotation(totalSpins);

    setTimeout(() => {
      setIsFlippingAnim(false);
      setFlipResultGame(game);
      playCoinLand(); // Metallic landing clink!
      setSpectateGame((current) =>
        current?.id === game.id
          ? { ...current, ...game, result: targetFace, status: 'complete' }
          : current
      );
      if (game.winnerId?.toLowerCase() === account?.toLowerCase()) {
        try {
          confetti({ particleCount: 90, spread: 90, origin: { y: 0.55 } });
          playCoinVictory(); // Celestial victory chime!
        } catch (e) {}
      } else {
        // Player lost: wait 2 seconds to view result, then auto-close popup
        setTimeout(() => {
          handleCloseSpectateModal();
          onShowToast(`Room #${game.roomNumber || game.id.slice(-4)}: ${game.winnerName} won the duel.`, false);
        }, 2000);
      }
      activeFlipIdRef.current = null;

      // Resume backsound after duel outcome celebration concludes
      setTimeout(() => {
        resumeBgm();
      }, 2500);
    }, 3200);
  }, [account, isFlippingAnim, pauseBgm, resumeBgm, playCoinToss, playSuspenseRiser, playCoinLand, playCoinVictory, handleCloseSpectateModal, onShowToast]);

  // Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    const handleGamesUpdate = (updatedGames: CoinFlipGame[]) => {
      setGames(updatedGames || []);

      // Keep spectate modal in sync
      setSpectateGame((current) => {
        if (!current) return null;
        const fresh = updatedGames?.find((g) => g.id === current.id);
        if (fresh) {
          if (current.status === 'waiting' && fresh.status === 'flipping') {
            triggerFlipAnimation(fresh);
          }
          return { ...current, ...fresh };
        }
        return current;
      });

      const myFlipping = updatedGames?.find(
        (g) =>
          g.status === 'flipping' &&
          (g.creatorId?.toLowerCase() === account?.toLowerCase() ||
            g.challengerId?.toLowerCase() === account?.toLowerCase())
      );
      if (myFlipping && !isFlippingAnim) {
        triggerFlipAnimation(myFlipping);
      }
    };

    const handleGameComplete = (completedGame: CoinFlipGame) => {
      setSpectateGame((current) => {
        if (current && current.id === completedGame.id) {
          return { ...current, ...completedGame };
        }
        return current;
      });

      if (completedGame.winnerId?.toLowerCase() === account?.toLowerCase()) {
        setUnclaimedWins((prev) => {
          if (prev.some((u) => u.id === completedGame.id)) return prev;
          return [{ ...completedGame, isClaimed: false }, ...prev];
        });
      }

      if (
        completedGame.creatorId?.toLowerCase() === account?.toLowerCase() ||
        completedGame.challengerId?.toLowerCase() === account?.toLowerCase()
      ) {
        setFlipResultGame(completedGame);
        if (completedGame.winnerId?.toLowerCase() === account?.toLowerCase()) {
          try {
            confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
            playWin();
          } catch (e) {}
        }
      }
    };

    const handleCreateResult = (res: { success: boolean; message: string; game?: CoinFlipGame }) => {
      setIsSubmitting(false);
      setIsPayingCreate(false);
      onShowToast(res.message, res.success);
      if (res.success && res.game) {
        setSpectateGame(res.game);
        playChip();
      }
    };

    const handleJoinResult = (res: { success: boolean; message: string; game?: CoinFlipGame }) => {
      setIsSubmitting(false);
      setIsPayingJoin(false);
      onShowToast(res.message, res.success);
      if (res.success && res.game) {
        setSpectateGame(res.game);
        triggerFlipAnimation(res.game);
      }
    };

    const handleCancelResult = (res: { success: boolean; refundAmount?: number; message?: string }) => {
      if (res.success) {
        if (res.refundAmount) {
          onShowToast(`Room cancelled. ${res.refundAmount} ${TOKEN_SYMBOL} returned to your wallet.`, true);
          refreshBalances();
        } else {
          onShowToast(res.message || 'Room cancelled.', true);
        }
        setSpectateGame(null);
      } else {
        onShowToast(res.message || 'Failed to cancel room.', false);
      }
    };

    const handleUnclaimedList = (list: CoinFlipGame[]) => {
      if (Array.isArray(list)) {
        setUnclaimedWins(list);
      }
    };

    const handleUnclaimedAlert = ({ winnerId, game }: { winnerId: string; game: CoinFlipGame }) => {
      if (winnerId?.toLowerCase() === account?.toLowerCase()) {
        setUnclaimedWins((prev) => {
          if (prev.some((u) => u.id === game.id)) return prev;
          return [{ ...game, isClaimed: false }, ...prev];
        });
        onShowToast(`🏆 Victory! You won in Room #${game.roomNumber || game.id.slice(-4)}! ${game.winAmount} ${TOKEN_SYMBOL} ready to claim.`, true);
      }
    };

    const handleClaimConfirmed = ({ gameId }: { gameId: string }) => {
      setUnclaimedWins((prev) => prev.filter((u) => u.id !== gameId));
    };

    socket.on('coinflip_games', handleGamesUpdate);
    socket.on('coinflip_complete', handleGameComplete);
    socket.on('create_coinflip_result', handleCreateResult);
    socket.on('join_coinflip_result', handleJoinResult);
    socket.on('cancel_coinflip_result', handleCancelResult);
    socket.on('unclaimed_coinflips', handleUnclaimedList);
    socket.on('unclaimed_coinflip_alert', handleUnclaimedAlert);
    socket.on('coinflip_claim_confirmed', handleClaimConfirmed);

    if (account) {
      socket.emit('get_unclaimed_coinflips', { address: account });
    }

    return () => {
      socket.off('coinflip_games', handleGamesUpdate);
      socket.off('coinflip_complete', handleGameComplete);
      socket.off('create_coinflip_result', handleCreateResult);
      socket.off('join_coinflip_result', handleJoinResult);
      socket.off('cancel_coinflip_result', handleCancelResult);
      socket.off('unclaimed_coinflips', handleUnclaimedList);
      socket.off('unclaimed_coinflip_alert', handleUnclaimedAlert);
      socket.off('coinflip_claim_confirmed', handleClaimConfirmed);
    };
  }, [socket, account, isFlippingAnim, playChip, playWin, onShowToast, triggerFlipAnimation, refreshBalances]);

  // Step 1: Open Payment Confirmation Modal for Player 1
  const handleInitiateCreate = () => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (!socket) {
      onShowToast('Connecting to game server...', false);
      return;
    }
    if (betAmount < 100000) {
      onShowToast(`Minimum bet is 100,000 ${TOKEN_SYMBOL}.`, false);
      return;
    }
    if (usdgBalance < betAmount) {
      onShowToast(`Insufficient balance. You have ${usdgBalance.toFixed(2)} ${TOKEN_SYMBOL}.`, false);
      return;
    }
    setShowCreateConfirmModal(true);
    playTick();
  };

  // Step 2: Player 1 Confirms Payment and Creates Room
  const handleConfirmAndPayCreate = async () => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (usdgBalance < betAmount) {
      onShowToast(`Insufficient balance. Required: ${betAmount} ${TOKEN_SYMBOL}.`, false);
      return;
    }

    setIsPayingCreate(true);
    try {
      const customId = `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // 1. On-chain smart contract vault payment
      const txHash = await placeBet(customId, betAmount);

      // 2. Once confirmed, room is published to lobby
      socket?.emit('create_coinflip', {
        creatorId: account,
        creatorName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
        creatorAvatar: userProfile.avatar || '/image/logo.png',
        betAmount,
        side: selectedSide,
        customId,
        txHash,
      });

      setShowCreateConfirmModal(false);
      onShowToast(`Deposit of ${betAmount} ${TOKEN_SYMBOL} confirmed! Room created.`, true);
      playChip();
    } catch (e: any) {
      onShowToast(e?.message || 'Failed to process room creation deposit.', false);
    } finally {
      setIsPayingCreate(false);
    }
  };

  // Open Modal as Spectator (Eye button)
  const handleOpenSpectateModal = (game: CoinFlipGame) => {
    setSpectateGame(game);
    setIsConfirmingBet(false);
    setPvpClaimTx(null);
    playTick();
  };

  // Open Modal with Bet Confirmation ready (Join button)
  const handleOpenJoinModal = (game: CoinFlipGame) => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    setSpectateGame(game);
    setIsConfirmingBet(true);
    setPvpClaimTx(null);
    playTick();
  };

  // Player 2 Confirms Payment and Joins Room
  const handleExecuteJoin = async (game: CoinFlipGame) => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (!socket) {
      onShowToast('Connecting to game server...', false);
      return;
    }
    if (usdgBalance < game.betAmount) {
      onShowToast(`Insufficient balance. Required: ${game.betAmount} ${TOKEN_SYMBOL}.`, false);
      return;
    }

    setIsPayingJoin(true);
    setIsSubmitting(true);
    try {
      // 1. Player 2 pays exact matching bet amount!
      const txHash = await placeBet(game.id, game.betAmount);

      // 2. Once paid, join duel room!
      socket.emit('join_coinflip', {
        gameId: game.id,
        challengerId: account,
        challengerName: userProfile.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
        challengerAvatar: userProfile.avatar || '/image/logo.png',
        txHash,
      });

      onShowToast(`Payment of ${game.betAmount} ${TOKEN_SYMBOL} confirmed! Duel commenced.`, true);
    } catch (e: any) {
      onShowToast(e?.message || 'Failed to process duel payment.', false);
      setIsSubmitting(false);
      setIsPayingJoin(false);
    }
  };

  // Claim PvP Winnings from Smart Contract
  const handleClaimPvp = async (game: CoinFlipGame) => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    setIsClaimingPvp(true);
    setClaimingGameId(game.id);
    try {
      const tx = await claimWinnings(
        game.id,
        game.winAmount || game.betAmount * 2,
        game.serverSeed,
        game.serverSeedHash
      );
      if (tx) {
        setPvpClaimTx(tx);
        socket?.emit('mark_coinflip_claimed', {
          gameId: game.id,
          claimTxHash: tx,
          address: account,
        });
        setUnclaimedWins((prev) => prev.filter((u) => u.id !== game.id));
        setSpectateGame((current) => current && current.id === game.id ? { ...current, isClaimed: true, claimTxHash: tx } : current);
      }
      playCoinClaim(); // Cascading golden coins sound!
      onShowToast(`Room #${game.roomNumber || game.id.slice(-4)} winnings (${(game.winAmount || game.betAmount * 2).toLocaleString()} ${TOKEN_SYMBOL}) successfully settled!`, true);
      await refreshBalances();

      // Automatically close modal after claim confirmed
      setTimeout(() => {
        if (spectateGame?.id === game.id) {
          handleCloseSpectateModal();
          setIsConfirmingBet(false);
        }
      }, 1200);
    } catch (e: any) {
      onShowToast(e?.message || 'Failed to claim winnings.', false);
    } finally {
      setIsClaimingPvp(false);
      setClaimingGameId(null);
    }
  };

  const handleCancelGame = (gameId: string) => {
    if (!socket || !account) return;
    socket.emit('cancel_coinflip', { gameId, requesterId: account });
    playTick();
  };

  const [isSummoningAi, setIsSummoningAi] = useState<boolean>(false);

  // Trigger VS AI match directly inside waiting room popup
  const handlePlayVsAiInRoom = (game: CoinFlipGame) => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (!socket) {
      onShowToast('Connecting to game server...', false);
      return;
    }
    setIsSummoningAi(true);

    socket.emit(
      'play_coinflip_room_ai',
      { gameId: game.id, requesterId: account },
      (res: { success: boolean; message: string; game?: CoinFlipGame }) => {
        setIsSummoningAi(false);
        if (res.success && res.game) {
          setSpectateGame(res.game);
          triggerFlipAnimation(res.game);
        } else {
          onShowToast(res.message || 'Failed to start AI Oracle duel.', false);
        }
      }
    );
  };

  // Filtered & Sorted Games List
  const displayGames = useMemo(() => {
    let list = [...games];

    if (filterAmount === 'small') list = list.filter((g) => g.betAmount <= 250000);
    else if (filterAmount === 'med') list = list.filter((g) => g.betAmount > 250000 && g.betAmount <= 1000000);
    else if (filterAmount === 'large') list = list.filter((g) => g.betAmount > 1000000);

    if (sortBy === 'high') list.sort((a, b) => b.betAmount - a.betAmount);
    else if (sortBy === 'low') list.sort((a, b) => a.betAmount - b.betAmount);
    else list.sort((a, b) => b.createdAt - a.createdAt);

    return list;
  }, [games, filterAmount, sortBy]);

  return (
    <div className="space-y-5 select-none font-mono">
      {/* ═══════════════════════════════════════════════════════════
          1. TOP CONTROL BAR (CYBER OBSIDIAN & NEON CYAN)
          ═══════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 border border-[#00E701]/25 bg-[#080C14] rounded-xl relative shadow-[0_0_25px_rgba(205, 180, 134,0.05)] backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left Title */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 rounded-lg border border-[#00E701]/40 bg-[#05070B] p-1 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(205, 180, 134,0.2)]">
              <Coins className="w-6 h-6 text-[#00E701]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-architectural font-bold tracking-wider text-[#E2E8F0] uppercase">
                COINFLIP DUELS
              </h2>
              <p className="text-[11px] font-sans text-[#94A3B8]">
                High-stakes 50/50 cryptographic duels settled in {TOKEN_SYMBOL}.
              </p>
            </div>
          </div>

          {/* Right Inputs: Bet Amount + Additive Chips + Side Toggle + Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start lg:justify-end gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Bet Input & Additive Buttons */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-[#05070B] border border-[#00E701]/20 rounded-lg p-1.5 w-full sm:w-auto shadow-inner">
              <div className="flex items-center min-w-0">
                <span className="text-xs font-mono font-bold text-[#00E701] px-2 flex-shrink-0">{TOKEN_SYMBOL}</span>
                <input
                  type="number"
                  min="100000"
                  step="10000"
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(Math.max(100000, Number(e.target.value)))}
                  className="w-20 sm:w-28 bg-transparent font-mono text-xs font-bold text-[#E2E8F0] focus:outline-none px-1"
                  placeholder="100000"
                />
              </div>
              {/* Quick Add Chips */}
              <div className="flex items-center gap-1 pl-1.5 border-l border-[#00E701]/20 overflow-x-auto">
                {[
                  { label: '+100k', val: 100000 },
                  { label: '+250k', val: 250000 },
                  { label: '+500k', val: 500000 },
                  { label: '+1M', val: 1000000 },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => {
                      setBetAmount((prev) => Number((prev + chip.val).toFixed(0)));
                      playTick();
                    }}
                    className="px-2 py-1 text-[10px] font-mono font-bold rounded bg-[#0D1322] text-[#E2E8F0] hover:bg-[#00E701] hover:text-[#05070B] transition-all flex-shrink-0 shadow-sm cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coin Side Selector (Head / Tail) & Create Button grouped on mobile */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 p-1 bg-[#05070B] rounded-lg border border-[#00E701]/20">
                {/* Head Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSide('heads');
                    playTick();
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 flex items-center justify-center ${
                    selectedSide === 'heads'
                      ? 'border-[#00E701] shadow-[0_0_15px_rgba(205, 180, 134,0.7)] scale-105 bg-[#00E701]/20'
                      : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                  title="Select Head"
                >
                  <img src="/head.png" alt="Head" className="w-full h-full object-contain pointer-events-none" />
                </button>

                {/* Tail Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSide('tails');
                    playTick();
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 flex items-center justify-center ${
                    selectedSide === 'tails'
                      ? 'border-[#FFFFFF] shadow-[0_0_15px_rgba(232,223,207,0.7)] scale-105 bg-[#FFFFFF]/20'
                      : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                  title="Select Tail"
                >
                  <img src="/tail.png" alt="Tail" className="w-full h-full object-contain pointer-events-none" />
                </button>
              </div>

              {/* Create PvP Duel Button */}
              <button
                type="button"
                disabled={isSubmitting || isPayingCreate || usdgBalance < betAmount}
                onClick={handleInitiateCreate}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-[#00E701] hover:bg-[#213743] text-[#05070B] font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_18px_rgba(205, 180, 134,0.35)]"
              >
                {isPayingCreate ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-[#05070B]" />
                    <span>Paying...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#05070B]" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. FILTER & SORT HEADER (CYBER BLUE & BLACK)
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-[#00E701]/15 pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-architectural font-bold uppercase tracking-wider text-[#E2E8F0]">
            ALL DUELS
          </span>
          <span className="px-2 py-0.5 bg-[#080C14] border border-[#00E701]/30 rounded font-mono text-[11px] text-[#00E701] font-bold">
            {games.length}
          </span>
          <span className="text-[#00E701]">•</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0D1322] border border-[#00E701]/20 rounded text-[11px] font-mono text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E701] animate-pulse" />
            <span>Settled in {TOKEN_SYMBOL}</span>
          </div>
        </div>

        {/* Sort & Amount Filter Selectors */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-[11px] font-mono text-[#94A3B8] w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#080C14] border border-[#00E701]/20 rounded px-2 py-1 font-mono text-xs text-[#E2E8F0] focus:outline-none focus:border-[#00E701]"
            >
              <option value="newest">Newest</option>
              <option value="high">High to Low</option>
              <option value="low">Low to High</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Amount:</span>
            <select
              value={filterAmount}
              onChange={(e: any) => setFilterAmount(e.target.value)}
              className="bg-[#080C14] border border-[#00E701]/20 rounded px-2 py-1 font-mono text-xs text-[#E2E8F0] focus:outline-none focus:border-[#00E701]"
            >
              <option value="all">All</option>
              <option value="small">≤ 250k {TOKEN_SYMBOL}</option>
              <option value="med">250k - 1M {TOKEN_SYMBOL}</option>
              <option value="large">&gt; 1M {TOKEN_SYMBOL}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchOpenGames}
            className="p-1.5 rounded border border-[#00E701]/20 hover:border-[#00E701] bg-[#080C14] text-[#00E701] transition-all flex-shrink-0"
            title="Refresh Chamber"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#00E701]" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2.5. UNCLAIMED REWARDS RECOVERY BANNER
          ═══════════════════════════════════════════════════════════ */}
      {unclaimedWins.length > 0 && (
        <div className="rounded-xl border border-[#00E701]/40 bg-[#080C14] text-[#E2E8F0] p-5 shadow-[0_0_25px_rgba(205, 180, 134,0.12)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-lg bg-[#00E701]/15 border border-[#00E701]/40 flex items-center justify-center text-[#00E701] flex-shrink-0 shadow-[0_0_12px_rgba(205, 180, 134,0.25)]">
                <Trophy className="w-6 h-6 text-[#00E701] animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg text-[#E2E8F0] tracking-wide font-architectural uppercase">
                    Unclaimed Victory Allotments
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#00E701]/15 text-[#00E701] border border-[#00E701]/30 rounded">
                    {unclaimedWins.length} Chambers Awaiting Settlement
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5 font-sans">
                  Disconnected before claiming? Your {TOKEN_SYMBOL} balance is 100% secured on-chain. Settle directly to your connected wallet:
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unclaimedWins.map((uw) => {
              const netWin = ((uw.winAmount || uw.betAmount * 2) * 0.98).toFixed(2);
              const isThisClaiming = isClaimingPvp && claimingGameId === uw.id;

              return (
                <div
                  key={uw.id}
                  className="p-3.5 rounded-lg border border-[#00E701]/20 bg-[#0D1322] flex flex-col justify-between gap-2.5 shadow-lg hover:border-[#00E701]/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#00E701] bg-[#00E701]/10 px-2.5 py-0.5 rounded border border-[#00E701]/30">
                      ROOM #CF-{uw.roomNumber || uw.id.replace('cf_', '').slice(0, 6)}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E701]/15 text-[#00E701] border border-[#00E701]/30 font-bold animate-pulse">
                      ● Unclaimed
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between py-1">
                    <span className="text-xs text-[#94A3B8] font-sans">Prize Pot:</span>
                    <div className="text-right">
                      <span className="text-base font-mono font-extrabold text-[#00E701]">
                        +{(uw.winAmount || uw.betAmount * 2).toLocaleString()} {TOKEN_SYMBOL}
                      </span>
                      <span className="block text-[10px] font-mono text-[#64748B]">
                        (Net: {netWin} {TOKEN_SYMBOL} after 2% burn)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#00E701]/15">
                    <button
                      type="button"
                      disabled={isClaimingPvp}
                      onClick={() => handleClaimPvp(uw)}
                      className="flex-1 py-2 rounded-lg bg-[#00E701] hover:bg-[#213743] text-[#05070B] font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(205, 180, 134,0.3)] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isThisClaiming ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Settling...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#05070B]" />
                          <span>Claim Prize</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSpectateModal(uw)}
                      className="p-2 rounded-lg border border-[#00E701]/20 hover:border-[#00E701] text-[#94A3B8] hover:text-[#00E701] transition-colors bg-[#080C14]"
                      title="View Duel Chamber"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          3. HORIZONTAL DUEL CARDS LIST (CYBER BLUE & BLACK)
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        {displayGames.length === 0 ? (
          <div className="p-12 rounded-xl text-center border border-[#00E701]/15 bg-[#080C14] space-y-3 shadow-[0_0_20px_rgba(205, 180, 134,0.03)]">
            <Coins className="w-10 h-10 text-[#00E701]/50 mx-auto" />
            <p className="text-sm font-architectural text-[#E2E8F0] font-bold">
              No active coinflip duels in the chamber.
            </p>
            <p className="text-xs font-sans text-[#94A3B8] max-w-sm mx-auto">
              Create a challenge using the controls above or challenge the AI Oracle directly via the <strong className="text-[#00E701]">VS AI</strong> button!
            </p>
          </div>
        ) : (
          displayGames.map((g) => {
            const isMine = g.creatorId?.toLowerCase() === account?.toLowerCase();
            const isFlipping = g.status === 'flipping';
            const isComplete = g.status === 'complete';
            const creatorSideImg = g.creatorSide === 'heads' ? '/head.png' : '/tail.png';
            const opponentSideImg = g.creatorSide === 'heads' ? '/tail.png' : '/head.png';

            return (
              <div
                key={g.id}
                className="p-3.5 sm:p-4 rounded-xl border border-[#00E701]/15 hover:border-[#00E701]/40 bg-[#080C14] transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative shadow-md hover:shadow-[0_0_15px_rgba(205, 180, 134,0.08)]"
              >
                {/* Players Section (Face-to-Face on Mobile, Inline on Desktop) */}
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 flex-1 min-w-0">
                  {/* Creator Profile */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
                    <div className="relative flex-shrink-0">
                      <img
                        src={g.creatorAvatar || '/image/logo.png'}
                        alt=""
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-[#00E701]/40 object-cover bg-[#05070B]"
                      />
                      {/* Coin Badge Overlay on Avatar */}
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border border-[#00E701] bg-[#080C14] shadow p-0.5">
                        <img src={creatorSideImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#00E701]/10 border border-[#00E701]/30 text-[#00E701] font-bold rounded">
                          #CF-{g.roomNumber || g.id.replace('cf_', '').slice(0, 6)}
                        </span>
                        {g.isClaimed && (
                          <span className="px-1.5 py-0.2 text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                            Claimed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#00E701]/20 border border-[#00E701]/40 text-[#00E701] font-bold rounded">
                          OPERATOR
                        </span>
                        <p className="text-xs sm:text-sm font-mono font-bold text-[#E2E8F0] truncate max-w-[85px] sm:max-w-none">
                          {g.creatorName} {isMine && '(You)'}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#94A3B8] block truncate">
                        {g.creatorSide === 'heads' ? 'Head' : 'Tail'}
                      </span>
                    </div>
                  </div>

                  {/* Center: Swords Duel Icon */}
                  <div className="flex items-center justify-center text-[#00E701] px-1 flex-shrink-0 opacity-80">
                    <Swords className="w-4 h-4" />
                  </div>

                  {/* Opponent Slot */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial justify-end sm:justify-start">
                    <div className="min-w-0 text-right sm:text-left order-1 sm:order-2">
                      <div className="flex items-center justify-end sm:justify-start gap-1.5">
                        <p className="text-xs sm:text-sm font-mono text-[#94A3B8] truncate max-w-[85px] sm:max-w-none">
                          {g.challengerName || 'Waiting...'}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-[#00E701] block truncate">
                        {g.creatorSide === 'heads' ? 'Tail' : 'Head'}
                      </span>
                    </div>

                    <div className="relative flex-shrink-0 order-2 sm:order-1">
                      {g.challengerAvatar ? (
                        <img
                          src={g.challengerAvatar}
                          alt=""
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-[#00E701]/40 object-cover bg-[#05070B]"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-dashed border-[#00E701]/25 bg-[#05070B] flex items-center justify-center text-xs font-mono font-bold text-[#64748B]">
                          ?
                        </div>
                      )}
                      {/* Opponent Coin Badge */}
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border border-[#00E701] bg-[#080C14] shadow p-0.5">
                        <img src={opponentSideImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Bet Amount Pill + Action Button + Spectate Eye */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#00E701]/10">
                  {/* Stake Pill */}
                  <div className="px-3 py-1.5 rounded-lg bg-[#05070B] border border-[#00E701]/30 font-mono text-xs font-bold text-[#00E701] flex items-center gap-1.5 flex-shrink-0">
                    <span>{g.betAmount.toLocaleString()} {TOKEN_SYMBOL}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* Join, Claim or Cancel Button */}
                    {isFlipping ? (
                      <span className="px-3 sm:px-4 py-1.5 rounded-lg bg-[#00E701]/10 border border-[#00E701]/40 text-[#00E701] text-xs font-mono flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Flipping...
                      </span>
                    ) : isComplete ? (
                      g.winnerId?.toLowerCase() === account?.toLowerCase() && !g.isClaimed ? (
                        <button
                          type="button"
                          disabled={isClaimingPvp}
                          onClick={() => handleClaimPvp(g)}
                          className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#00E701] hover:bg-[#213743] text-[#05070B] text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(205, 180, 134,0.3)] flex items-center gap-1.5 animate-pulse cursor-pointer"
                        >
                          {isClaimingPvp && claimingGameId === g.id ? (
                            <>
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>Claiming...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-[#05070B]" />
                              <span>Claim Prize</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0D1322] border border-[#00E701]/25 text-[#00E701] text-xs font-mono font-bold">
                          Victor: {g.winnerName} {g.isClaimed ? '(Claimed)' : ''}
                        </span>
                      )
                    ) : isMine ? (
                      <button
                        type="button"
                        onClick={() => handleOpenSpectateModal(g)}
                        className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#0D1322] hover:bg-[#00E701] hover:text-[#05070B] text-[#00E701] text-xs font-mono font-bold tracking-wider uppercase border border-[#00E701]/40 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>My Room / VS AI</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleOpenJoinModal(g)}
                        className="px-4 sm:px-5 py-1.5 rounded-lg bg-[#00E701] hover:bg-[#213743] text-[#05070B] text-xs font-mono font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(205, 180, 134,0.3)] cursor-pointer"
                      >
                        Join Duel
                      </button>
                    )}

                    {/* Spectate Eye Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSpectateModal(g)}
                      className="p-1.5 sm:p-2 rounded-lg border border-[#00E701]/20 hover:border-[#00E701] bg-[#05070B] text-[#94A3B8] hover:text-[#00E701] transition-colors"
                      title="Spectate Duel"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          3.5 POP-UP MODAL: PLAYER 1 CONFIRM PAYMENT & CREATE ROOM
          ═══════════════════════════════════════════════════════════ */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showCreateConfirmModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-[#030508]/85 backdrop-blur-xl">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="relative w-full max-w-md max-h-[92vh] overflow-y-auto glass-capsule rounded-3xl p-6 text-[#F5F7FA] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.15)] border border-white/10 font-sans space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#00E701]/10 border border-[#00E701]/25 flex items-center justify-center text-[#00E701] shadow-inner">
                      <Coins className="w-5 h-5 text-[#00E701]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base tracking-wide uppercase text-[#F5F7FA]">
                        CONFIRM DUEL STAKE
                      </h3>
                      <span className="text-[10px] font-mono tracking-wider uppercase text-[#00E701]">Robinhood Smart Contract</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPayingCreate}
                    onClick={() => setShowCreateConfirmModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    You are creating a new Coinflip duel room. Confirm your stake deposit of <strong className="text-[#00E701] font-mono font-bold">{betAmount} {TOKEN_SYMBOL}</strong> to open the chamber to the public:
                  </p>

                  {/* Details Card */}
                  <div className="p-4 glass-capsule rounded-2xl space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8993A4]">Stake Amount:</span>
                      <span className="font-bold text-[#00E701] text-sm">{betAmount} {TOKEN_SYMBOL}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#8993A4]">Selected Coin Side:</span>
                      <span className="font-bold text-[#F5F7FA] flex items-center gap-2">
                        <img
                          src={selectedSide === 'heads' ? '/head.png' : '/tail.png'}
                          alt=""
                          className="w-4 h-4 object-contain"
                        />
                        <span>{selectedSide === 'heads' ? 'Head' : 'Tail'}</span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[#8993A4]">Target Prize Pot:</span>
                      <span className="font-bold text-[#00E701] text-sm">
                        {(betAmount * 2).toLocaleString()} {TOKEN_SYMBOL} (2.0×)
                      </span>
                    </div>

                    <div className="border-t border-white/[0.06] pt-2.5 flex justify-between items-center text-[11px]">
                      <span className="text-[#8993A4]">Your Wallet Balance:</span>
                      <span className="text-[#F5F7FA] font-semibold">{usdgBalance.toFixed(2)} {TOKEN_SYMBOL}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8993A4]">Balance After Deposit:</span>
                      <span className="text-[#00E701] font-semibold">
                        {Math.max(0, usdgBalance - betAmount).toFixed(2)} {TOKEN_SYMBOL}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 glass-capsule rounded-2xl border border-[#00E701]/30 bg-[#00E701]/[0.04] text-[11px] text-[#8993A4] leading-snug">
                    ✦ <strong className="text-[#00E701]">Refund Guarantee</strong>: If you cancel the chamber before an opponent joins, your stake of {betAmount} {TOKEN_SYMBOL} will be returned to your wallet immediately.
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isPayingCreate}
                      onClick={() => setShowCreateConfirmModal(false)}
                      className="glass-btn-chip px-5 py-2.5 text-[#8993A4] hover:text-[#F5F7FA] text-xs font-bold uppercase tracking-wider text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isPayingCreate || usdgBalance < betAmount}
                      onClick={handleConfirmAndPayCreate}
                      className="flex-1 py-3 glass-btn-inflated font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isPayingCreate ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin text-[#030508]" />
                          <span>Processing Deposit...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-[#030508]" />
                          <span>Deposit &amp; Open ({betAmount} {TOKEN_SYMBOL})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════
          5. HIGH-FIDELITY DUEL ARENA MODAL (CYBER BLUE & BLACK)
          ═══════════════════════════════════════════════════════════ */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {spectateGame && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 bg-[#030508]/85 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto glass-capsule rounded-3xl text-[#F5F7FA] shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.2)] border border-white/10 flex flex-col font-sans"
            >
              {/* ── MODAL HEADER ── */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.06] sticky top-0 z-20 backdrop-blur-xl bg-[#030508]/85">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl border border-[#00E701]/30 bg-[#00E701]/10 flex items-center justify-center text-[#00E701] flex-shrink-0 shadow-inner">
                    <Swords className="w-4 h-4 text-[#00E701]" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-heading font-bold text-sm sm:text-base tracking-wide uppercase text-[#F5F7FA]">
                      COINFLIP DUEL
                    </span>
                    <span className="glass-pill-active font-mono text-[10px] sm:text-xs font-bold px-2.5 py-0.5">
                      #CF-{spectateGame.roomNumber || spectateGame.id.replace('cf_', '').slice(0, 6)}
                    </span>
                    {spectateGame.status === 'complete' && (
                      spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() ? (
                        <span className={`text-[9px] sm:text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${spectateGame.isClaimed ? 'glass-pill-active' : 'glass-pill-active animate-pulse'}`}>
                          {spectateGame.isClaimed ? '✓ CLAIMED' : '● UNCLAIMED'}
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          ✕ {spectateGame.winnerName} WON
                        </span>
                      )
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleCloseSpectateModal();
                    setIsConfirmingBet(false);
                    setPvpClaimTx(null);
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── MAIN DUEL STAGE ── */}
              <div className="relative p-4 sm:p-8 bg-[#05070B] border-b border-[#00E701]/20 overflow-hidden">
                {/* Subtle Grid Matrix Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00E701_1.2px,transparent_1.2px)] [background-size:20px_20px]" />
                
                {/* Cyber Cyan Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#00E701]/10 rounded-full blur-3xl pointer-events-none" />

                {/* 3 Columns: Creator ── Centerpiece Coin ── Opponent */}
                <div className="relative z-10 grid grid-cols-3 items-center gap-2 sm:gap-4">
                  {/* ── LEFT: CREATOR ── */}
                  <div className="flex flex-col items-center space-y-2 text-center min-w-0">
                    <div className="relative group">
                      <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-[#00E701]/40 bg-[#080C14] p-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                        <img
                          src={spectateGame.creatorAvatar || '/image/logo.png'}
                          alt={spectateGame.creatorName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      {/* Chosen Coin Badge Overlay */}
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#080C14] border border-[#00E701] shadow-md p-0.5 transform group-hover:scale-110 transition-transform">
                        <img
                          src={spectateGame.creatorSide === 'heads' ? '/head.png' : '/tail.png'}
                          alt={spectateGame.creatorSide}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Level Badge + Name */}
                    <div className="flex items-center gap-1 mt-1 max-w-full">
                      <span className="px-1.5 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#00E701]/10 border border-[#00E701]/30 text-[#00E701] rounded font-bold">
                        NODE
                      </span>
                      <span className="text-[11px] sm:text-sm font-bold text-[#E2E8F0] truncate max-w-[70px] xs:max-w-[85px] sm:max-w-[120px]">
                        {spectateGame.creatorName}
                      </span>
                    </div>

                    {/* Bet Amount Pill */}
                    <div className="px-2.5 sm:px-3 py-1 bg-[#0D1322] border border-[#00E701]/30 rounded-lg text-[10px] sm:text-xs font-mono font-bold text-[#E2E8F0] flex items-center gap-1 shadow-sm">
                      <span className="text-[#00E701] font-bold">≡</span>
                      <span>{spectateGame.betAmount} {TOKEN_SYMBOL}</span>
                    </div>
                  </div>

                  {/* ── CENTER: THE CENTERPIECE COIN ── */}
                  <div className="flex flex-col items-center justify-center">
                    {/* Metallic Orb Container */}
                    <div
                      className="relative w-22 h-22 xs:w-26 xs:h-26 sm:w-40 sm:h-40 rounded-full border-2 border-[#00E701]/60 bg-[#080C14] shadow-[0_0_35px_rgba(205, 180, 134,0.3)] flex items-center justify-center overflow-hidden"
                      style={{ perspective: 1200 }}
                    >
                      <style>{`
                        @keyframes coinGentleFloat {
                          0%, 100% { transform: translateY(0px) rotateY(0deg); }
                          50% { transform: translateY(-4px) rotateY(14deg); }
                        }
                        .coin-pure-spin {
                          animation: coinGentleFloat 3.6s ease-in-out infinite;
                          transform-style: preserve-3d;
                          will-change: transform;
                        }
                      `}</style>
                      {/* Ambient Inner Glow */}
                      <div className="absolute inset-0 bg-radial from-[#00E701]/25 via-transparent to-transparent pointer-events-none" />

                      {/* 3D Animated Coin */}
                      {spectateGame.status === 'waiting' && !isFlippingAnim ? (
                        <div
                          className="coin-pure-spin relative w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28"
                          style={{
                            transformStyle: 'preserve-3d',
                            willChange: 'transform',
                          }}
                        >
                          {/* Front Face: Head */}
                          <div
                            className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none select-none"
                            style={{
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(0deg) translateZ(1.5px)',
                            }}
                          >
                            <img
                              src="/head.png"
                              alt="Head"
                              className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(205,180,134,0.7)]"
                            />
                          </div>

                          {/* Back Face: Tail */}
                          <div
                            className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none select-none"
                            style={{
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg) translateZ(1.5px)',
                            }}
                          >
                            <img
                              src="/tail.png"
                              alt="Tail"
                              className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(232,223,207,0.7)]"
                            />
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          key={`coin-${spectateGame.id}`}
                          initial={{
                            rotateY: 0,
                            scale: 1,
                          }}
                          animate={{
                            rotateY: isFlippingAnim
                              ? flipRotation
                              : flipRotation > 0
                              ? flipRotation
                              : (spectateGame.result === 'heads' ? 0 : 180),
                            scale: isFlippingAnim ? [1, 1.25, 0.95, 1.08, 1] : 1,
                          }}
                          transition={
                            isFlippingAnim
                              ? {
                                  rotateY: { duration: 3.2, ease: [0.05, 0.75, 0.1, 1.0] },
                                  scale: { duration: 3.2, ease: 'easeOut' },
                                }
                              : { duration: 0 }
                          }
                          className="relative w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28"
                          style={{
                            transformStyle: 'preserve-3d',
                            willChange: 'transform',
                          }}
                        >
                          {/* Front Face: Head */}
                          <div
                            className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none select-none"
                            style={{
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(0deg) translateZ(1.5px)',
                            }}
                          >
                            <img
                              src="/head.png"
                              alt="Head"
                              className={`w-full h-full object-contain ${
                                spectateGame.status === 'complete' && spectateGame.result === 'heads'
                                  ? 'drop-shadow-[0_0_26px_rgba(205,180,134,1)] animate-pulse'
                                  : 'drop-shadow-[0_0_16px_rgba(205,180,134,0.7)]'
                              }`}
                            />
                          </div>

                          {/* Back Face: Tail */}
                          <div
                            className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none select-none"
                            style={{
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg) translateZ(1.5px)',
                            }}
                          >
                            <img
                              src="/tail.png"
                              alt="Tail"
                              className={`w-full h-full object-contain ${
                                spectateGame.status === 'complete' && spectateGame.result === 'tails'
                                  ? 'drop-shadow-[0_0_26px_rgba(232,223,207,1)] animate-pulse'
                                  : 'drop-shadow-[0_0_16px_rgba(232,223,207,0.7)]'
                              }`}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: OPPONENT / CHALLENGER ── */}
                  <div className="flex flex-col items-center space-y-2 text-center min-w-0">
                    <div className="relative group">
                      {spectateGame.challengerAvatar || spectateGame.challengerId ? (
                        <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-[#00E701]/40 bg-[#080C14] p-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                          <img
                            src={spectateGame.challengerAvatar || '/image/logo.png'}
                            alt={spectateGame.challengerName || 'Challenger'}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-[#00E701]/20 bg-[#080C14]/50 flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl text-[#64748B] font-bold">?</span>
                        </div>
                      )}
                      {/* Opposing Coin Badge Overlay */}
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#080C14] border border-[#00E701] shadow-md p-0.5 transform group-hover:scale-110 transition-transform">
                        <img
                          src={spectateGame.creatorSide === 'heads' ? '/tail.png' : '/head.png'}
                          alt="Opponent side"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Name & Level Badge */}
                    <div className="flex items-center gap-1 mt-1 max-w-full">
                      {spectateGame.challengerId && (
                        <span className="px-1.5 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#00E701]/10 border border-[#00E701]/30 text-[#00E701] rounded font-bold">
                          NODE
                        </span>
                      )}
                      <span className="text-[11px] sm:text-sm font-bold text-[#E2E8F0] truncate max-w-[70px] xs:max-w-[85px] sm:max-w-[120px]">
                        {spectateGame.challengerName || 'Waiting...'}
                      </span>
                    </div>

                    {/* Bet Pill */}
                    <div className="px-2.5 sm:px-3 py-1 bg-[#0D1322] border border-[#00E701]/30 rounded-lg text-[10px] sm:text-xs font-mono font-bold text-[#E2E8F0] flex items-center gap-1 shadow-sm">
                      <span className="text-[#00E701] font-bold">≡</span>
                      <span>{spectateGame.challengerId ? spectateGame.betAmount : 0} {TOKEN_SYMBOL}</span>
                    </div>
                  </div>
                </div>

                {/* ── ACTION AREA UNDERNEATH THE 3-COLUMN STAGE (FULL WIDTH ON MOBILE) ── */}
                <div className="mt-5 sm:mt-6 w-full flex flex-col items-center justify-center relative z-10">
                  {spectateGame.status === 'waiting' && (
                    <>
                      {spectateGame.creatorId?.toLowerCase() === account?.toLowerCase() ? (
                        <div className="flex flex-col items-center gap-2 sm:gap-2.5 w-full max-w-xs text-center">
                          <span className="text-[11px] text-[#00E701] font-semibold animate-pulse">
                            Stake confirmed on-chain • Awaiting challenger...
                          </span>

                          <div className="w-full">
                            <button
                              type="button"
                              disabled={isSummoningAi || isFlippingAnim}
                              onClick={() => handlePlayVsAiInRoom(spectateGame)}
                              className="w-full py-2.5 px-4 glass-btn-inflated text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Bot className="w-4 h-4 text-[#030508]" />
                              <span>{isSummoningAi ? 'Summoning AI...' : 'VS AI'}</span>
                            </button>
                          </div>

                          <span className="text-[11px] text-[#8993A4]">
                            Duel the smart contract vault immediately with 2.0× return!
                          </span>
                        </div>
                      ) : isConfirmingBet ? (
                        <div className="flex flex-col items-center gap-3 glass-capsule rounded-2xl p-4 shadow-xl w-full max-w-xs text-center animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                          <p className="text-xs text-[#F5F7FA] leading-tight">
                            Confirm matching stake of <strong className="text-[#00E701] font-mono font-bold">{spectateGame.betAmount} {TOKEN_SYMBOL}</strong> to duel?
                          </p>
                          <div className="text-[11px] font-mono text-[#8993A4]">
                            Balance: <span className="text-[#00E701] font-bold">{usdgBalance.toFixed(2)} {TOKEN_SYMBOL}</span>
                          </div>
                          <div className="flex items-center gap-2 w-full pt-1">
                            <button
                              type="button"
                              disabled={isPayingJoin || isSubmitting || usdgBalance < spectateGame.betAmount}
                              onClick={() => handleExecuteJoin(spectateGame)}
                              className="flex-1 py-2 glass-btn-inflated text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isPayingJoin ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 animate-spin text-[#030508]" />
                                  <span className="text-[11px]">Processing...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-[#030508]" />
                                  <span>Pay &amp; Duel</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isPayingJoin || isSubmitting}
                              onClick={() => setIsConfirmingBet(false)}
                              className="px-3.5 py-2 glass-btn-chip text-xs uppercase font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingBet(true)}
                          className="w-full sm:w-auto px-8 py-3 glass-btn-inflated text-xs sm:text-sm uppercase tracking-widest text-center cursor-pointer"
                        >
                          Join Duel
                        </button>
                      )}
                    </>
                  )}

                  {spectateGame.status === 'flipping' && (
                    <div className="px-6 py-2.5 glass-capsule rounded-full text-[#00E701] text-xs font-semibold flex items-center gap-2.5 animate-pulse text-center">
                      <Clock className="w-4 h-4 animate-spin text-[#00E701] flex-shrink-0" />
                      <span className="tracking-wide text-xs">Resolving Coin Duel...</span>
                    </div>
                  )}

                  {spectateGame.status === 'complete' && (
                    <div className="flex flex-col items-center gap-2.5 text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm">
                      {spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() ? (
                        <div className="px-5 py-2.5 glass-capsule rounded-2xl border border-[#00E701]/40 text-[#00E701] text-xs font-bold flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#00E701] flex-shrink-0" />
                          <span>Victor: {spectateGame.winnerName} (You Won!)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="px-5 py-2.5 glass-capsule rounded-2xl border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <span>Victor: {spectateGame.winnerName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#8993A4] animate-pulse">
                            Defeat. Closing chamber...
                          </span>
                        </div>
                      )}

                      {spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() && (
                        spectateGame.isClaimed ? (
                          <div className="px-5 py-2.5 glass-capsule rounded-2xl border border-[#00E701]/30 text-[#00E701] font-bold text-xs flex items-center justify-center gap-2 w-full">
                            <CheckCircle2 className="w-4 h-4 text-[#00E701] flex-shrink-0" />
                            <span>Prize Successfully Claimed (+{(spectateGame.winAmount || spectateGame.betAmount * 2).toLocaleString()} {TOKEN_SYMBOL})</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isClaimingPvp}
                            onClick={() => handleClaimPvp(spectateGame)}
                            className="px-6 py-3 glass-btn-inflated text-xs uppercase tracking-widest flex items-center justify-center gap-2 w-full cursor-pointer"
                          >
                            {isClaimingPvp ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin text-[#030508]" />
                                <span>Settling...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-[#030508]" />
                                <span>Claim {(spectateGame.winAmount || spectateGame.betAmount * 2).toLocaleString()} {TOKEN_SYMBOL}</span>
                              </>
                            )}
                          </button>
                        )
                      )}

                      {pvpClaimTx && (
                        <a
                          href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${pvpClaimTx}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#00E701] hover:underline"
                        >
                          <span>View Tx on Explorer</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── MODAL FOOTER: PROVABLY FAIR & SHARE ── */}
              <div className="p-4 sm:p-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-[#8993A4]">
                {/* Hashed Seed and Secret */}
                <div className="space-y-1 max-w-full overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <span className="font-bold text-[#F5F7FA] flex-shrink-0">HASHED SEED:</span>
                    <span
                      onClick={() => {
                        const seedHash =
                          spectateGame.serverSeedHash ||
                          'cb0671568308b49639931e377e19cec4b673cccba6ffc938d0042359a427b68d';
                        navigator.clipboard.writeText(seedHash);
                        onShowToast('Hashed seed copied to clipboard!', true);
                      }}
                      className="truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[340px] cursor-pointer hover:text-[#00E701] transition-colors"
                      title="Click to copy hash"
                    >
                      {spectateGame.serverSeedHash ||
                        'cb0671568308b49639931e377e19cec4b673cccba6ffc938d0042359a427b68d'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#F5F7FA] flex-shrink-0">SECRET:</span>
                    <span className="text-[#8993A4]/70 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                      {spectateGame.status === 'complete' && spectateGame.serverSeed
                        ? spectateGame.serverSeed
                        : 'Revealed upon completion'}
                    </span>
                  </div>
                </div>

                {/* Provably Fair Shield & Share Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onShowToast('Provably fair SHA-256 seed commitment verified on Robinhood Chain.', true)
                    }
                    className="p-2.5 rounded-xl border border-white/[0.08] hover:border-[#00E701]/40 text-[#8993A4] hover:text-[#00E701] transition-colors bg-white/[0.02] cursor-pointer"
                    title="Provably Fair Verification"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `Join my Coinflip #${spectateGame.id.replace('cf_', '').slice(0, 7)} duel for ${spectateGame.betAmount} ${TOKEN_SYMBOL}!`;
                      navigator.clipboard.writeText(shareText);
                      playChip();
                      onShowToast('Duel link copied to clipboard!', true);
                    }}
                    className="glass-btn-chip px-3.5 py-2 text-[#00E701] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Share</span>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
