'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';

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
  const [betAmount, setBetAmount] = useState<number>(10);
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
          onShowToast(`Room cancelled. ${res.refundAmount} USDG returned to your wallet.`, true);
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
        onShowToast(`🏆 Victory! You won in Room #${game.roomNumber || game.id.slice(-4)}! ${game.winAmount} USDG ready to claim.`, true);
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
    if (betAmount < 0.5) {
      onShowToast('Minimum bet is 0.5 USDG.', false);
      return;
    }
    if (usdgBalance < betAmount) {
      onShowToast(`Insufficient balance. You have ${usdgBalance.toFixed(2)} USDG.`, false);
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
      onShowToast(`Insufficient balance. Required: ${betAmount} USDG.`, false);
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
      onShowToast(`Deposit of ${betAmount} USDG confirmed! Room created.`, true);
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
      onShowToast(`Insufficient balance. Required: ${game.betAmount} USDG.`, false);
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

      onShowToast(`Payment of ${game.betAmount} USDG confirmed! Duel commenced.`, true);
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
      onShowToast(`Room #${game.roomNumber || game.id.slice(-4)} winnings (${(game.winAmount || game.betAmount * 2).toLocaleString()} USDG) successfully settled!`, true);
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

    if (filterAmount === 'small') list = list.filter((g) => g.betAmount <= 10);
    else if (filterAmount === 'med') list = list.filter((g) => g.betAmount > 10 && g.betAmount <= 50);
    else if (filterAmount === 'large') list = list.filter((g) => g.betAmount > 50);

    if (sortBy === 'high') list.sort((a, b) => b.betAmount - a.betAmount);
    else if (sortBy === 'low') list.sort((a, b) => a.betAmount - b.betAmount);
    else list.sort((a, b) => b.createdAt - a.createdAt);

    return list;
  }, [games, filterAmount, sortBy]);

  return (
    <div className="space-y-5 select-none font-serif">
      {/* ═══════════════════════════════════════════════════════════
          1. TOP CONTROL BAR (MATCHING USER SCREENSHOT ARCHITECTURE)
          ═══════════════════════════════════════════════════════════ */}
      <div className="editorial-frame p-4 sm:p-5 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/25 dark:border-[#9E8055]/30 relative shadow-sm">
        <BookplateCorner />
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left Title */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 border border-[#9E8055] bg-[#E8DFD1] dark:bg-[#201E1B] p-1 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Coins className="w-6 h-6 text-[#9E8055]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold tracking-wider text-[#171513] dark:text-[#E8DFD1] uppercase">
                COINFLIP
              </h2>
              <p className="text-[11px] font-serif text-[#171513]/60 dark:text-[#E8DFD1]/60">
                The classic 50/50 celestial duel settled in USDG.
              </p>
            </div>
          </div>

          {/* Right Inputs: Bet Amount + Additive Chips + Side Toggle + Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start lg:justify-end gap-2 sm:gap-3 w-full lg:w-auto">
            {/* Bet Input & Additive Buttons */}
            <div className="flex items-center justify-between sm:justify-start gap-1 bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/25 dark:border-[#E8DFD1]/20 p-1 w-full sm:w-auto">
              <div className="flex items-center min-w-0">
                <span className="text-xs font-mono font-bold text-[#9E8055] px-1.5 sm:px-2 flex-shrink-0">USDG</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  max="50000"
                  value={betAmount || ''}
                  onChange={(e) => setBetAmount(Math.max(0.5, Number(e.target.value)))}
                  className="w-16 sm:w-20 bg-transparent font-mono text-xs font-bold text-[#171513] dark:text-[#E8DFD1] focus:outline-none px-1"
                  placeholder="0.5"
                />
              </div>
              {/* Quick Add Chips */}
              <div className="flex items-center gap-1 pl-1 border-l border-[#171513]/15 dark:border-[#E8DFD1]/15 overflow-x-auto">
                {[0.5, 1, 5, 10, 50].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => {
                      setBetAmount((prev) => Number((prev + delta).toFixed(1)));
                      playTick();
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F4EFE6] dark:bg-[#201E1B] hover:bg-[#171513] hover:text-[#F4EFE6] dark:hover:bg-[#BCA172] dark:hover:text-[#121110] border border-[#171513]/20 dark:border-[#E8DFD1]/20 transition-colors flex-shrink-0"
                  >
                    +{delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Coin Side Selector (Head / Tail) & Create Button grouped on mobile */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 p-1 bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/25 dark:border-[#E8DFD1]/20">
                {/* Head Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSide('heads');
                    playTick();
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all p-0.5 flex items-center justify-center ${
                    selectedSide === 'heads'
                      ? 'border-[#9E8055] shadow-[0_0_10px_rgba(158,128,85,0.6)] scale-105 bg-[#F4EFE6] dark:bg-[#2A2620]'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                  title="Select Head (Luna Cat)"
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
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all p-0.5 flex items-center justify-center ${
                    selectedSide === 'tails'
                      ? 'border-[#9E8055] shadow-[0_0_10px_rgba(158,128,85,0.6)] scale-105 bg-[#F4EFE6] dark:bg-[#2A2620]'
                      : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                  title="Select Tail (Crescent Tail)"
                >
                  <img src="/tail.png" alt="Tail" className="w-full h-full object-contain pointer-events-none" />
                </button>
              </div>

              {/* Create PvP Duel Button */}
              <button
                type="button"
                disabled={isSubmitting || isPayingCreate || usdgBalance < betAmount}
                onClick={handleInitiateCreate}
                className="flex-1 sm:flex-initial px-4 py-2 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] font-serif text-xs font-bold tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                {isPayingCreate ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-[#9E8055] dark:text-[#121110]" />
                    <span>Paying...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-[#9E8055] dark:text-[#121110]" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2. FILTER & SORT HEADER (MATCHING SCREENSHOT)
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 pb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-display font-bold uppercase tracking-wider text-[#171513] dark:text-[#E8DFD1]">
            ALL GAMES
          </span>
          <span className="px-2 py-0.5 bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/20 dark:border-[#E8DFD1]/20 font-mono text-[10px] text-[#9E8055] font-bold">
            {games.length}
          </span>
          <span className="text-[#9E8055]">•</span>
          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[10px] font-mono text-[#171513]/70 dark:text-[#E8DFD1]/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Payouts are settled in USDG</span>
          </div>
        </div>

        {/* Sort & Amount Filter Selectors */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-[11px] font-mono text-[#171513]/70 dark:text-[#E8DFD1]/70 w-full sm:w-auto">
          <div className="flex items-center gap-1">
            <span className="font-serif">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/20 dark:border-[#E8DFD1]/20 px-1.5 sm:px-2 py-0.5 font-mono text-xs text-[#171513] dark:text-[#E8DFD1] focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="high">High to Low</option>
              <option value="low">Low to High</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-serif">Amount:</span>
            <select
              value={filterAmount}
              onChange={(e: any) => setFilterAmount(e.target.value)}
              className="bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/20 dark:border-[#E8DFD1]/20 px-1.5 sm:px-2 py-0.5 font-mono text-xs text-[#171513] dark:text-[#E8DFD1] focus:outline-none"
            >
              <option value="all">All</option>
              <option value="small">≤ 10 USDG</option>
              <option value="med">10 - 50 USDG</option>
              <option value="large">&gt; 50 USDG</option>
            </select>
          </div>

          <button
            type="button"
            onClick={fetchOpenGames}
            className="p-1 border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] transition-colors flex-shrink-0"
            title="Refresh Chamber"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#9E8055]" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          2.5. UNCLAIMED REWARDS RECOVERY BANNER (IF DISCONNECTED/CLOSED)
          ═══════════════════════════════════════════════════════════ */}
      {unclaimedWins.length > 0 && (
        <div className="border border-[#9E8055]/50 bg-[#F4EFE6] dark:bg-[#1A1815] text-[#171513] dark:text-[#E8DFD1] p-4 sm:p-5 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-[#9E8055]/15 border border-[#9E8055]/40 flex items-center justify-center text-[#9E8055] flex-shrink-0 shadow-sm">
                <Trophy className="w-6 h-6 text-[#9E8055] animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg text-[#171513] dark:text-[#E8DFD1] tracking-wide font-display uppercase">
                    Unclaimed Victory Allotments
                  </h3>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#9E8055]/15 text-[#9E8055] border border-[#9E8055]/30">
                    {unclaimedWins.length} Chambers Awaiting Settlement
                  </span>
                </div>
                <p className="text-xs text-[#171513]/70 dark:text-[#E8DFD1]/70 mt-0.5 font-serif">
                  Disconnected before claiming? Your USDG balance is 100% secured on-chain. Settle directly to your OKX Wallet:
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
                  className="p-3.5 border border-[#171513]/20 dark:border-[#E8DFD1]/20 bg-[#EAE3D5] dark:bg-[#13110F] flex flex-col justify-between gap-2.5 shadow-sm hover:border-[#9E8055] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#9E8055] bg-[#9E8055]/15 px-2.5 py-0.5 border border-[#9E8055]/30">
                      ROOM #CF-{uw.roomNumber || uw.id.replace('cf_', '').slice(0, 6)}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold animate-pulse">
                      🟡 Unclaimed
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between py-1">
                    <span className="text-xs text-[#171513]/70 dark:text-[#E8DFD1]/70 font-serif">Prize Pot:</span>
                    <div className="text-right">
                      <span className="text-base font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{(uw.winAmount || uw.betAmount * 2).toLocaleString()} USDG
                      </span>
                      <span className="block text-[10px] font-mono text-[#171513]/50 dark:text-[#E8DFD1]/50">
                        (Net: {netWin} USDG after 2% fee)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10">
                    <button
                      type="button"
                      disabled={isClaimingPvp}
                      onClick={() => handleClaimPvp(uw)}
                      className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-serif font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5 border border-emerald-400/50 transition-all disabled:opacity-50"
                    >
                      {isThisClaiming ? (
                        <>
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Settling...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Claim Prize (OKX)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSpectateModal(uw)}
                      className="p-2 border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] text-[#171513]/70 dark:text-[#E8DFD1]/70 transition-colors"
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
          3. HORIZONTAL DUEL CARDS LIST (EXACT LAYOUT AS SCREENSHOT)
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-2.5">
        {displayGames.length === 0 ? (
          <div className="editorial-card p-12 text-center bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/20 dark:border-[#E8DFD1]/15 space-y-3">
            <Coins className="w-10 h-10 text-[#9E8055]/50 mx-auto" />
            <p className="text-sm font-serif text-[#171513]/80 dark:text-[#E8DFD1]/80 font-semibold">
              No active coinflip duels in the chamber.
            </p>
            <p className="text-xs font-serif text-[#171513]/60 dark:text-[#E8DFD1]/60 max-w-sm mx-auto">
              Create a challenge using the controls above or challenge the AI Oracle directly via the <strong className="text-[#9E8055]">VS AI</strong> button!
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
                className="editorial-card p-3 sm:p-4 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/20 dark:border-[#E8DFD1]/15 hover:border-[#9E8055] transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative shadow-sm"
              >
                {/* Players Section (Face-to-Face on Mobile, Inline on Desktop) */}
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 flex-1 min-w-0">
                  {/* Creator Profile */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
                    <div className="relative flex-shrink-0">
                      <img
                        src={g.creatorAvatar || '/image/logo.png'}
                        alt=""
                        className="w-10 h-10 sm:w-11 sm:h-11 border border-[#9E8055] object-cover bg-[#E8DFD1] dark:bg-[#201E1B]"
                      />
                      {/* Coin Badge Overlay on Avatar */}
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border border-[#9E8055] bg-[#F4EFE6] dark:bg-[#141311] shadow p-0.5">
                        <img src={creatorSideImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-bold rounded">
                          #CF-{g.roomNumber || g.id.replace('cf_', '').slice(0, 6)}
                        </span>
                        {g.isClaimed && (
                          <span className="px-1 py-0.2 text-[8px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded">
                            Claimed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#9E8055]/20 border border-[#9E8055] text-[#9E8055] font-bold">
                          60
                        </span>
                        <p className="text-xs sm:text-sm font-serif font-bold text-[#171513] dark:text-[#E8DFD1] truncate max-w-[85px] sm:max-w-none">
                          {g.creatorName} {isMine && '(You)'}
                        </p>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-[#171513]/50 dark:text-[#E8DFD1]/50 block truncate">
                        {g.creatorSide === 'heads' ? 'Head' : 'Tail'}
                      </span>
                    </div>
                  </div>

                  {/* Center: Swords Duel Icon */}
                  <div className="flex items-center justify-center text-[#9E8055] px-1 flex-shrink-0 opacity-75">
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Opponent Slot */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial justify-end sm:justify-start">
                    <div className="min-w-0 text-right sm:text-left order-1 sm:order-2">
                      <div className="flex items-center justify-end sm:justify-start gap-1.5">
                        <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#171513]/10 dark:bg-[#E8DFD1]/10 text-[#171513]/60 dark:text-[#E8DFD1]/60">
                          1
                        </span>
                        <p className="text-xs sm:text-sm font-serif text-[#171513]/70 dark:text-[#E8DFD1]/70 truncate max-w-[85px] sm:max-w-none">
                          {g.challengerName || 'Waiting...'}
                        </p>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-mono text-[#9E8055] block truncate">
                        {g.creatorSide === 'heads' ? 'Tail' : 'Head'}
                      </span>
                    </div>

                    <div className="relative flex-shrink-0 order-2 sm:order-1">
                      {g.challengerAvatar ? (
                        <img
                          src={g.challengerAvatar}
                          alt=""
                          className="w-10 h-10 sm:w-11 sm:h-11 border border-[#9E8055] object-cover bg-[#E8DFD1] dark:bg-[#201E1B]"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-11 sm:h-11 border border-dashed border-[#171513]/30 dark:border-[#E8DFD1]/30 bg-[#E8DFD1]/50 dark:bg-[#141311]/50 flex items-center justify-center text-xs font-serif font-bold text-[#171513]/50 dark:text-[#E8DFD1]/50">
                          ?
                        </div>
                      )}
                      {/* Opponent Coin Badge */}
                      <div className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border border-[#9E8055] bg-[#F4EFE6] dark:bg-[#141311] shadow p-0.5">
                        <img src={opponentSideImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Bet Amount Pill + Action Button + Spectate Eye */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#171513]/10 dark:border-[#E8DFD1]/10">
                  {/* Stake Pill */}
                  <div className="px-2.5 sm:px-3 py-1.5 bg-[#E8DFD1] dark:bg-[#141311] border border-[#171513]/20 dark:border-[#E8DFD1]/20 font-mono text-xs font-bold text-[#171513] dark:text-[#E8DFD1] flex items-center gap-1 flex-shrink-0">
                    <span className="text-[#9E8055]">✦</span>
                    <span>{g.betAmount.toLocaleString()} USDG</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* Join, Claim or Cancel Button */}
                    {isFlipping ? (
                      <span className="px-3 sm:px-4 py-1.5 bg-[#9E8055]/20 border border-[#9E8055] text-[#9E8055] text-xs font-mono flex items-center gap-1.5 animate-pulse">
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Flipping...
                      </span>
                    ) : isComplete ? (
                      g.winnerId?.toLowerCase() === account?.toLowerCase() && !g.isClaimed ? (
                        <button
                          type="button"
                          disabled={isClaimingPvp}
                          onClick={() => handleClaimPvp(g)}
                          className="px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-serif font-bold uppercase tracking-wider border border-emerald-400 shadow-md shadow-emerald-950/40 flex items-center gap-1.5 animate-pulse"
                        >
                          {isClaimingPvp && claimingGameId === g.id ? (
                            <>
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>Claiming...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                              <span>Claim Prize</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="px-2.5 sm:px-3 py-1.5 bg-emerald-900/15 border border-emerald-600/40 text-emerald-600 dark:text-emerald-400 text-xs font-serif font-bold">
                          Victor: {g.winnerName} {g.isClaimed ? '(Claimed)' : ''}
                        </span>
                      )
                    ) : isMine ? (
                      <button
                        type="button"
                        onClick={() => handleOpenSpectateModal(g)}
                        className="px-3 sm:px-3.5 py-1.5 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] text-xs font-serif font-bold tracking-wider uppercase border border-[#9E8055] flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Bot className="w-3.5 h-3.5 text-[#DFC493] dark:text-[#121110]" />
                        <span>My Room / VS AI</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleOpenJoinModal(g)}
                        className="px-4 sm:px-5 py-1.5 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] text-xs font-serif font-bold tracking-widest uppercase border border-[#9E8055]/50 transition-all shadow-sm"
                      >
                        Join Duel
                      </button>
                    )}

                    {/* Spectate Eye Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenSpectateModal(g)}
                      className="p-1.5 sm:p-2 border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] text-[#171513]/60 dark:text-[#E8DFD1]/60 transition-colors"
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
      <AnimatePresence>
        {showCreateConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0a0908]/80 dark:bg-[#070605]/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#F4EFE6] dark:bg-[#161412] text-[#171513] dark:text-[#E8DFD1] shadow-2xl border border-[#171513]/25 dark:border-[#BCA172]/40 font-serif"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-[#EAE3D5] dark:bg-[#1F1C18]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 border border-[#9E8055] bg-[#9E8055]/15 flex items-center justify-center text-[#9E8055]">
                    <Coins className="w-4 h-4 text-[#9E8055]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm sm:text-base tracking-widest uppercase text-[#171513] dark:text-[#E8DFD1]">
                      CONFIRM DUEL STAKE
                    </h3>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-[#9E8055]">Robinhood Smart Contract Vault</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPayingCreate}
                  onClick={() => setShowCreateConfirmModal(false)}
                  className="w-7 h-7 border border-[#171513]/15 dark:border-[#E8DFD1]/15 hover:border-[#9E8055] flex items-center justify-center text-[#171513]/60 dark:text-[#E8DFD1]/60 hover:text-[#9E8055] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                <p className="text-xs text-[#171513]/80 dark:text-[#E8DFD1]/80 font-serif leading-relaxed">
                  You are creating a new Coinflip duel room. Confirm your stake deposit of <strong className="text-[#9E8055] font-mono font-bold">{betAmount} USDG</strong> to open the chamber to the public:
                </p>

                {/* Details Card */}
                <div className="p-3 sm:p-4 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-[#13110F] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-[#171513]/60 dark:text-[#E8DFD1]/60">Stake Amount:</span>
                    <span className="font-bold text-[#9E8055] text-sm">≡ {betAmount} USDG</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#171513]/60 dark:text-[#E8DFD1]/60">Selected Coin Side:</span>
                    <span className="font-bold text-[#171513] dark:text-[#E8DFD1] flex items-center gap-1.5">
                      <img
                        src={selectedSide === 'heads' ? '/head.png' : '/tail.png'}
                        alt=""
                        className="w-4 h-4 object-contain"
                      />
                      <span>{selectedSide === 'heads' ? 'Head (Luna Cat)' : 'Tail (Crescent Tail)'}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#171513]/60 dark:text-[#E8DFD1]/60">Target Prize Pot:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {(betAmount * 2).toLocaleString()} USDG (2.0×)
                    </span>
                  </div>

                  <div className="border-t border-[#171513]/10 dark:border-[#E8DFD1]/10 pt-2 flex justify-between items-center text-[11px]">
                    <span className="text-[#171513]/50 dark:text-[#E8DFD1]/50">Your Wallet Balance:</span>
                    <span className="text-[#171513] dark:text-[#E8DFD1] font-semibold">{usdgBalance.toFixed(2)} USDG</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#171513]/50 dark:text-[#E8DFD1]/50">Balance After Deposit:</span>
                    <span className="text-[#9E8055] font-semibold">
                      {Math.max(0, usdgBalance - betAmount).toFixed(2)} USDG
                    </span>
                  </div>
                </div>

                <div className="p-2.5 border border-[#9E8055]/30 bg-[#9E8055]/10 text-[11px] text-[#171513]/80 dark:text-[#E8DFD1]/80 font-serif leading-tight">
                  ✦ <strong>Refund Guarantee</strong>: If you cancel the chamber before an opponent joins, your stake of {betAmount} USDG will be returned to your wallet immediately.
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isPayingCreate}
                    onClick={() => setShowCreateConfirmModal(false)}
                    className="px-5 py-2.5 bg-transparent hover:bg-[#171513]/10 dark:hover:bg-white/10 text-[#171513]/70 dark:text-[#E8DFD1]/70 text-xs font-serif uppercase tracking-wider border border-[#171513]/20 dark:border-[#E8DFD1]/20 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPayingCreate || usdgBalance < betAmount}
                    onClick={handleConfirmAndPayCreate}
                    className="flex-1 py-2.5 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] font-serif text-xs font-bold tracking-widest uppercase border border-[#9E8055]/50 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isPayingCreate ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin text-[#9E8055] dark:text-[#121110]" />
                        <span>Processing Deposit...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-[#9E8055] dark:text-[#121110]" />
                        <span>Deposit &amp; Open ({betAmount} USDG)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          5. HIGH-FIDELITY DUEL ARENA MODAL (EXACT LAYOUT AS SCREENSHOT)
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {spectateGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#0a0908]/80 dark:bg-[#070605]/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto bg-[#F4EFE6] dark:bg-[#161412] text-[#171513] dark:text-[#E8DFD1] shadow-2xl border border-[#171513]/25 dark:border-[#BCA172]/40 flex flex-col font-serif"
            >
              {/* ── MODAL HEADER ── */}
              <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-[#EAE3D5] dark:bg-[#1F1C18] sticky top-0 z-20">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 border border-[#9E8055] bg-[#9E8055]/15 flex items-center justify-center text-[#9E8055] flex-shrink-0">
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9E8055]" />
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                    <span className="font-display font-bold text-sm sm:text-lg tracking-widest uppercase text-[#171513] dark:text-[#E8DFD1]">
                      COINFLIP DUEL
                    </span>
                    <span className="font-mono text-[10px] sm:text-xs font-bold text-[#9E8055] bg-[#9E8055]/15 px-1.5 sm:px-2 py-0.5 border border-[#9E8055]/30">
                      #CF-{spectateGame.roomNumber || spectateGame.id.replace('cf_', '').slice(0, 6)}
                    </span>
                    {spectateGame.status === 'complete' && (
                      spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() ? (
                        <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 font-bold ${spectateGame.isClaimed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 animate-pulse'}`}>
                          {spectateGame.isClaimed ? '✓ CLAIMED' : '🟡 UNCLAIMED'}
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
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
                  className="w-7 h-7 sm:w-8 sm:h-8 border border-[#171513]/15 dark:border-[#E8DFD1]/15 hover:border-[#9E8055] text-[#171513]/60 dark:text-[#E8DFD1]/60 hover:text-[#9E8055] flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* ── MAIN DUEL STAGE ── */}
              <div className="relative p-3.5 sm:p-8 bg-[#F8F5EE] dark:bg-[#12100E] overflow-hidden">
                {/* Subtle Dot Matrix Pattern */}
                <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none bg-[radial-gradient(#9E8055_1.2px,transparent_1.2px)] [background-size:20px_20px]" />
                
                {/* Subtle Warm Ether Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#BCA172]/10 rounded-full blur-3xl pointer-events-none" />

                {/* 3 Columns: Creator ── Centerpiece Coin ── Opponent */}
                <div className="relative z-10 grid grid-cols-3 items-center gap-1.5 sm:gap-4">
                  {/* ── LEFT: CREATOR ── */}
                  <div className="flex flex-col items-center space-y-1.5 sm:space-y-2 text-center min-w-0">
                    <div className="relative group">
                      <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 overflow-hidden border border-[#171513]/25 dark:border-[#BCA172]/40 bg-[#E8DFD1] dark:bg-[#1C1917] p-0.5 sm:p-1 shadow-md">
                        <img
                          src={spectateGame.creatorAvatar || '/image/logo.png'}
                          alt={spectateGame.creatorName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Chosen Coin Badge Overlay */}
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#F4EFE6] dark:bg-[#171513] border border-[#9E8055] shadow-md p-0.5 transform group-hover:scale-110 transition-transform">
                        <img
                          src={spectateGame.creatorSide === 'heads' ? '/head.png' : '/tail.png'}
                          alt={spectateGame.creatorSide}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Level Badge + Name */}
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1 max-w-full">
                      <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#E8DFD1] dark:bg-[#25211D] border border-[#171513]/20 dark:border-[#E8DFD1]/20 text-[#9E8055] font-bold">
                        60
                      </span>
                      <span className="text-[11px] sm:text-sm font-bold font-serif text-[#171513] dark:text-[#E8DFD1] truncate max-w-[70px] xs:max-w-[85px] sm:max-w-[120px]">
                        {spectateGame.creatorName}
                      </span>
                    </div>

                    {/* Bet Amount Pill */}
                    <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#E8DFD1] dark:bg-[#181614] border border-[#171513]/20 dark:border-[#E8DFD1]/20 text-[10px] sm:text-xs font-mono font-bold text-[#171513] dark:text-[#E8DFD1] flex items-center gap-1 shadow-sm">
                      <span className="text-[#9E8055] font-bold">≡</span>
                      <span>{spectateGame.betAmount} USDG</span>
                    </div>
                  </div>

                  {/* ── CENTER: THE CENTERPIECE COIN ── */}
                  <div className="flex flex-col items-center justify-center">
                    {/* Metallic Orb Container */}
                    <div
                      className="relative w-22 h-22 xs:w-26 xs:h-26 sm:w-40 sm:h-40 rounded-full border-2 border-[#9E8055]/50 bg-[#F4EFE6] dark:bg-[#151311] shadow-[0_0_30px_rgba(188,161,114,0.2)] flex items-center justify-center overflow-hidden"
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
                      <div className="absolute inset-0 bg-radial from-[#BCA172]/15 via-transparent to-transparent pointer-events-none" />

                      {/* 3D Animated Coin */}
                      {spectateGame.status === 'waiting' && !isFlippingAnim ? (
                        <div
                          className="coin-pure-spin relative w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28"
                          style={{
                            transformStyle: 'preserve-3d',
                            willChange: 'transform',
                          }}
                        >
                          {/* Front Face: Luna Cat (Head) */}
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
                              alt="Luna Cat (Head)"
                              className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]"
                            />
                          </div>

                          {/* Back Face: Crescent Tail (Tail) */}
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
                              alt="Crescent Tail"
                              className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(168,85,247,0.6)]"
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
                          {/* Front Face: Luna Cat (Head) */}
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
                              alt="Luna Cat (Head)"
                              className={`w-full h-full object-contain ${
                                spectateGame.status === 'complete' && spectateGame.result === 'heads'
                                  ? 'drop-shadow-[0_0_24px_rgba(234,179,8,0.9)] animate-pulse'
                                  : 'drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]'
                              }`}
                            />
                          </div>

                          {/* Back Face: Crescent Tail (Tail) */}
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
                              alt="Crescent Tail"
                              className={`w-full h-full object-contain ${
                                spectateGame.status === 'complete' && spectateGame.result === 'tails'
                                  ? 'drop-shadow-[0_0_24px_rgba(168,85,247,0.9)] animate-pulse'
                                  : 'drop-shadow-[0_0_16px_rgba(168,85,247,0.6)]'
                              }`}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: OPPONENT / CHALLENGER ── */}
                  <div className="flex flex-col items-center space-y-1.5 sm:space-y-2 text-center min-w-0">
                    <div className="relative group">
                      {spectateGame.challengerAvatar || spectateGame.challengerId ? (
                        <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 overflow-hidden border border-[#171513]/25 dark:border-[#BCA172]/40 bg-[#E8DFD1] dark:bg-[#1C1917] p-0.5 sm:p-1 shadow-md">
                          <img
                            src={spectateGame.challengerAvatar || '/image/logo.png'}
                            alt={spectateGame.challengerName || 'Challenger'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24 border border-dashed border-[#171513]/30 dark:border-[#E8DFD1]/30 bg-[#E8DFD1]/40 dark:bg-white/5 flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl font-serif text-[#171513]/30 dark:text-white/30 font-bold">?</span>
                        </div>
                      )}
                      {/* Opposing Coin Badge Overlay */}
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#F4EFE6] dark:bg-[#171513] border border-[#9E8055] shadow-md p-0.5 transform group-hover:scale-110 transition-transform">
                        <img
                          src={spectateGame.creatorSide === 'heads' ? '/tail.png' : '/head.png'}
                          alt="Opponent side"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Name & Level Badge */}
                    <div className="flex items-center gap-1 mt-0.5 sm:mt-1 max-w-full">
                      {spectateGame.challengerId && (
                        <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-mono bg-[#E8DFD1] dark:bg-[#25211D] border border-[#171513]/20 dark:border-[#E8DFD1]/20 text-[#9E8055] font-bold">
                          1
                        </span>
                      )}
                      <span className="text-[11px] sm:text-sm font-bold font-serif text-[#171513] dark:text-[#E8DFD1] truncate max-w-[70px] xs:max-w-[85px] sm:max-w-[120px]">
                        {spectateGame.challengerName || 'Waiting...'}
                      </span>
                    </div>

                    {/* Bet Pill */}
                    <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#E8DFD1] dark:bg-[#181614] border border-[#171513]/20 dark:border-[#E8DFD1]/20 text-[10px] sm:text-xs font-mono font-bold text-[#171513] dark:text-[#E8DFD1] flex items-center gap-1 shadow-sm">
                      <span className="text-[#9E8055] font-bold">≡</span>
                      <span>{spectateGame.challengerId ? spectateGame.betAmount : 0} USDG</span>
                    </div>
                  </div>
                </div>

                {/* ── ACTION AREA UNDERNEATH THE 3-COLUMN STAGE (FULL WIDTH ON MOBILE) ── */}
                <div className="mt-4 sm:mt-6 w-full flex flex-col items-center justify-center relative z-10">
                  {spectateGame.status === 'waiting' && (
                    <>
                      {spectateGame.creatorId?.toLowerCase() === account?.toLowerCase() ? (
                        <div className="flex flex-col items-center gap-2 sm:gap-2.5 w-full max-w-xs text-center">
                          <span className="text-[10px] sm:text-[11px] font-serif text-[#9E8055] animate-pulse">
                            Stake confirmed on-chain • Awaiting challenger...
                          </span>

                          <div className="w-full">
                            <button
                              type="button"
                              disabled={isSummoningAi || isFlippingAnim}
                              onClick={() => handlePlayVsAiInRoom(spectateGame)}
                              className="w-full py-2.5 px-4 bg-[#171513] hover:bg-[#2A2621] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] font-serif font-bold text-xs uppercase tracking-widest border border-[#9E8055] shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                              <Bot className="w-4 h-4 text-[#DFC493] dark:text-[#121110]" />
                              <span>{isSummoningAi ? 'Summoning AI...' : 'VS AI'}</span>
                            </button>
                          </div>

                          <span className="text-[10px] font-serif text-[#171513]/60 dark:text-[#E8DFD1]/60">
                            Duel the smart contract vault immediately with 2.0× return!
                          </span>
                        </div>
                      ) : isConfirmingBet ? (
                        <div className="flex flex-col items-center gap-2 bg-[#EAE3D5] dark:bg-[#1A1816] border border-[#171513]/20 dark:border-[#E8DFD1]/20 p-3 sm:p-4 shadow-md w-full max-w-xs text-center animate-in fade-in zoom-in-95 duration-200">
                          <p className="text-xs font-serif text-[#171513] dark:text-[#E8DFD1] leading-tight">
                            Confirm matching stake of <strong className="text-[#9E8055] font-mono font-bold">{spectateGame.betAmount} USDG</strong> to duel?
                          </p>
                          <div className="text-[10px] font-mono text-[#171513]/60 dark:text-[#E8DFD1]/60">
                            Balance: <span className="text-[#9E8055] font-bold">{usdgBalance.toFixed(2)} USDG</span>
                          </div>
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              disabled={isPayingJoin || isSubmitting || usdgBalance < spectateGame.betAmount}
                              onClick={() => handleExecuteJoin(spectateGame)}
                              className="flex-1 py-2 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] text-xs font-serif font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5 border border-[#9E8055]/50 disabled:opacity-50"
                            >
                              {isPayingJoin ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 animate-spin text-[#9E8055] dark:text-[#121110]" />
                                  <span className="text-[11px]">Processing...</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 text-[#9E8055] dark:text-[#121110]" />
                                  <span>Pay &amp; Duel</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isPayingJoin || isSubmitting}
                              onClick={() => setIsConfirmingBet(false)}
                              className="px-3 py-2 bg-transparent hover:bg-[#171513]/10 dark:hover:bg-white/10 text-[#171513]/70 dark:text-[#E8DFD1]/70 text-xs uppercase font-serif border border-[#171513]/20 dark:border-[#E8DFD1]/20 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingBet(true)}
                          className="w-full sm:w-auto px-8 py-2.5 bg-[#171513] hover:bg-[#25221e] dark:bg-[#BCA172] dark:hover:bg-[#DFC493] text-[#F4EFE6] dark:text-[#121110] text-xs sm:text-sm font-serif font-bold uppercase tracking-widest border border-[#9E8055]/50 shadow-md transition-all transform active:scale-95 text-center"
                        >
                          Join Duel
                        </button>
                      )}
                    </>
                  )}

                  {spectateGame.status === 'flipping' && (
                    <div className="px-4 py-2 bg-[#E8DFD1] dark:bg-[#1E1B18] border border-[#9E8055]/50 text-[#9E8055] text-xs font-serif flex items-center gap-2 animate-pulse text-center">
                      <Clock className="w-4 h-4 animate-spin text-[#9E8055] flex-shrink-0" />
                      <span className="font-serif tracking-wide text-xs">Resolving Coin Duel...</span>
                    </div>
                  )}

                  {spectateGame.status === 'complete' && (
                    <div className="flex flex-col items-center gap-2 text-center animate-in fade-in zoom-in-95 duration-300 w-full max-w-sm">
                      {spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() ? (
                        <div className="px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-serif font-bold flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>Victor: {spectateGame.winnerName} (You Won!)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="px-3.5 py-1.5 bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-serif font-bold flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                            <span>Victor: {spectateGame.winnerName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#171513]/50 dark:text-[#E8DFD1]/50 animate-pulse">
                            Defeat. Closing chamber...
                          </span>
                        </div>
                      )}

                      {spectateGame.winnerId?.toLowerCase() === account?.toLowerCase() && (
                        spectateGame.isClaimed ? (
                          <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 w-full">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>Prize Successfully Claimed (+{(spectateGame.winAmount || spectateGame.betAmount * 2).toLocaleString()} USDG)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isClaimingPvp}
                            onClick={() => handleClaimPvp(spectateGame)}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-serif font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md border border-emerald-400/50 w-full transition-all disabled:opacity-50"
                          >
                            {isClaimingPvp ? (
                              <>
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                <span>Settling...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                <span>Claim {(spectateGame.winAmount || spectateGame.betAmount * 2).toLocaleString()} USDG</span>
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
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9E8055] underline"
                        >
                          <span>View Tx on Explorer</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── MODAL FOOTER: PROVABLY FAIR & SHARE ── */}
              <div className="p-3 sm:p-4 bg-[#EAE3D5] dark:bg-[#171513] border-t border-[#171513]/15 dark:border-[#E8DFD1]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-[#171513]/60 dark:text-[#E8DFD1]/60">
                {/* Hashed Seed and Secret */}
                <div className="space-y-0.5 max-w-full overflow-hidden">
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <span className="font-bold text-[#171513]/80 dark:text-[#E8DFD1]/80 flex-shrink-0">HASHED SEED:</span>
                    <span
                      onClick={() => {
                        const seedHash =
                          spectateGame.serverSeedHash ||
                          'cb0671568308b49639931e377e19cec4b673cccba6ffc938d0042359a427b68d';
                        navigator.clipboard.writeText(seedHash);
                        onShowToast('Hashed seed copied to clipboard!', true);
                      }}
                      className="truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[340px] cursor-pointer hover:text-[#9E8055] transition-colors"
                      title="Click to copy hash"
                    >
                      {spectateGame.serverSeedHash ||
                        'cb0671568308b49639931e377e19cec4b673cccba6ffc938d0042359a427b68d'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#171513]/80 dark:text-[#E8DFD1]/80 flex-shrink-0">SECRET:</span>
                    <span className="text-[#171513]/60 dark:text-[#E8DFD1]/60 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
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
                    className="p-1.5 sm:p-2 border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] text-[#171513]/70 dark:text-[#E8DFD1]/70 hover:text-[#9E8055] transition-colors"
                    title="Provably Fair Verification"
                  >
                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `Join my Coinflip #${spectateGame.id.replace('cf_', '').slice(0, 7)} duel for ${spectateGame.betAmount} USDG!`;
                      navigator.clipboard.writeText(shareText);
                      playChip();
                      onShowToast('Duel link copied to clipboard!', true);
                    }}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 border border-[#171513]/20 dark:border-[#E8DFD1]/20 hover:border-[#9E8055] text-[#171513]/80 dark:text-[#E8DFD1]/80 hover:text-[#9E8055] text-[11px] sm:text-xs font-serif flex items-center gap-1.5 transition-colors"
                  >
                    <span>Share</span>
                    <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
