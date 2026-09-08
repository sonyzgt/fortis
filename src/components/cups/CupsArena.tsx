'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Check,
  X,
  RotateCcw,
  Sparkles,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { useSound } from '@/context/SoundContext';
import { useSocket } from '@/context/SocketContext';
import { CupsGame, CupPickResult, CupsVerifyReport } from '@/types/cups';
import { TOKEN_SYMBOL, isGameClaimedOnChain } from '@/lib/web3/contracts';

interface CupsArenaProps {
  account: string | null;
  usdgBalance: number;
  userProfile: { name: string; avatar: string };
  onOpenWalletModal: () => void;
  onShowToast: (msg: string, ok?: boolean) => void;
}

const QUICK_AMOUNTS = [
  { label: '100k', val: 100000 },
  { label: '250k', val: 250000 },
  { label: '500k', val: 500000 },
  { label: '1M', val: 1000000 },
  { label: '2M', val: 2000000 },
];

export const CupsArena: React.FC<CupsArenaProps> = ({
  account,
  usdgBalance,
  userProfile,
  onOpenWalletModal,
  onShowToast,
}) => {
  const { socket } = useSocket();
  const {
    playMineTileClick,
    playMineGemReveal,
    playMineExplosion,
    playCoinToss,
    playCoinClaim,
    playCardDeal,
    playChip,
  } = useSound();
  const { placeBet, claimWinnings, refreshBalances } = useCashFlipWeb3();

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);

  const [betAmount, setBetAmount] = useState<number>(100000);
  const maxPicks = 1; // 1 single pick per round (2.94x)

  const [activeGame, setActiveGame] = useState<CupsGame | null>(null);
  const [endedGame, setEndedGame] = useState<CupsGame | null>(null);
  const [lastFinishedGame, setLastFinishedGame] = useState<CupsGame | null>(null);
  const [unclaimedWins, setUnclaimedWins] = useState<CupsGame[]>([]);

  // Animation phase:
  // 'idle' -> 'revealing_start' -> 'covering' -> 'shuffling' -> 'playing' -> 'ended'
  const [phase, setPhase] = useState<
    'idle' | 'revealing_start' | 'covering' | 'shuffling' | 'playing' | 'ended'
  >('idle');

  // cupSlots[cupId] = current slotIndex (0 = Left, 1 = Center, 2 = Right)
  const [cupSlots, setCupSlots] = useState<number[]>([0, 1, 2]);

  // Which cup ID holds the emblem throughout the shuffle
  const [logoCupId, setLogoCupId] = useState<number>(1);

  const [isStarting, setIsStarting] = useState(false);
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [claimingGameId, setClaimingGameId] = useState<string | null>(null);

  // Provably Fair Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyReport, setVerifyReport] = useState<CupsVerifyReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const shuffleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      const w = window.innerWidth;
      setIsNarrowMobile(w < 400);
      setIsMobile(w < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    };
  }, []);

  // Sync active game & unclaimed games
  const syncGameState = useCallback(async () => {
    if (!account) return;
    try {
      const actRes = await fetch(`/api/cups/active/${account}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        if (actData && actData.status === 'in_progress') {
          setActiveGame(actData);
          setBetAmount(actData.betAmount);
          setPhase('playing');
        } else {
          setActiveGame(null);
        }
      }

      const uncRes = await fetch(`/api/cups/unclaimed/${account}`);
      if (uncRes.ok) {
        const uncData = await uncRes.json();
        if (Array.isArray(uncData)) {
          const verified: CupsGame[] = [];
          for (const g of uncData) {
            const alreadyClaimed = await isGameClaimedOnChain(g.id);
            if (alreadyClaimed) {
              fetch('/api/cups/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: g.id, claimTxHash: 'already-claimed', address: account }),
              }).catch(() => {});
              socket?.emit('cups_mark_claimed', { gameId: g.id, claimTxHash: 'already-claimed', address: account });
            } else {
              verified.push(g);
            }
          }
          setUnclaimedWins(verified);
        }
      }
    } catch (e) {
      console.warn('Could not sync cups game state:', e);
    }
  }, [account, socket]);

  useEffect(() => {
    syncGameState();
  }, [syncGameState]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;
    const handleUnclaimed = async (list: CupsGame[]) => {
      if (!Array.isArray(list)) return;
      const verified: CupsGame[] = [];
      for (const g of list) {
        const alreadyClaimed = await isGameClaimedOnChain(g.id);
        if (alreadyClaimed) {
          fetch('/api/cups/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId: g.id, claimTxHash: 'already-claimed', address: account }),
          }).catch(() => {});
        } else {
          verified.push(g);
        }
      }
      setUnclaimedWins(verified);
    };

    socket.on('cups_unclaimed', handleUnclaimed);
    return () => {
      socket.off('cups_unclaimed', handleUnclaimed);
    };
  }, [socket, account]);

  // Multiplier & Potential Win
  const currentMultiplier = 2.94;

  const potentialWin = useMemo(() => {
    return Math.round(betAmount * currentMultiplier * 100) / 100;
  }, [betAmount]);

  // Execute authentic cup shuffle sequence
  const executeShuffleSequence = useCallback(
    (sequence: [number, number][], initialPos: number) => {
      let currentSlots = [0, 1, 2]; // cupSlots[cupId] = slotIndex
      let stepIndex = 0;

      const runNextSwap = () => {
        if (stepIndex >= sequence.length) {
          // Shuffle finished! Ready for player to pick
          setPhase('playing');
          playCoinToss();
          return;
        }

        const [slotA, slotB] = sequence[stepIndex];
        const cupInA = currentSlots.indexOf(slotA);
        const cupInB = currentSlots.indexOf(slotB);

        if (cupInA !== -1 && cupInB !== -1) {
          const nextSlots = [...currentSlots];
          nextSlots[cupInA] = slotB;
          nextSlots[cupInB] = slotA;
          currentSlots = nextSlots;
          setCupSlots(nextSlots);
          playCardDeal();
        }

        stepIndex++;
        shuffleTimeoutRef.current = setTimeout(runNextSwap, 110);
      };

      runNextSwap();
    },
    [playCardDeal, playCoinToss]
  );

  // Start Game with on-chain wager
  const handleStartGame = async () => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (betAmount < 100000) {
      onShowToast(`Minimum wager is 100,000 ${TOKEN_SYMBOL}`, false);
      return;
    }
    if (usdgBalance < betAmount) {
      onShowToast(`Insufficient ${TOKEN_SYMBOL} balance (${usdgBalance.toLocaleString()} available)`, false);
      return;
    }

    setIsStarting(true);
    setEndedGame(null);

    try {
      const customId = `cups_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      onShowToast('Please confirm the wager transaction in your wallet...', true);
      const txHash = await placeBet(customId, betAmount);

      if (!txHash) {
        throw new Error('Transaction was cancelled or rejected in wallet.');
      }

      playCoinToss();

      const res = await fetch('/api/cups/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: account,
          playerName: userProfile?.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
          betAmount,
          maxPicks,
          playerAvatar: userProfile?.avatar,
          gameId: customId,
          txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start game');
      }

      const game: CupsGame = data.game;
      const initialPos = game.initialPosition ?? 1;
      const sequence = game.shuffleSequence || [];

      setActiveGame(game);
      setCupSlots([0, 1, 2]);
      setLogoCupId(initialPos);
      await refreshBalances();

      // Step 1: All 3 cups open! (revealing_start)
      setPhase('revealing_start');
      playMineGemReveal();
      onShowToast(`Wager confirmed! Watch where the KOFUKU emblem is placed...`, true);

      // Step 2: After 0.75s, cups close over the emblem (covering)
      shuffleTimeoutRef.current = setTimeout(() => {
        setPhase('covering');
        playChip();

        // Step 3: After 0.25s, cups start shuffling across the table (shuffling)
        shuffleTimeoutRef.current = setTimeout(() => {
          setPhase('shuffling');
          executeShuffleSequence(sequence, initialPos);
        }, 250);
      }, 750);
    } catch (e: any) {
      console.error('Cups start error:', e);
      if (
        e?.code === 4001 ||
        e?.message?.includes('user rejected') ||
        e?.message?.includes('User denied') ||
        e?.message?.includes('cancelled')
      ) {
        onShowToast('Transaction was cancelled in wallet.', false);
      } else {
        onShowToast(e?.reason || e?.message || 'Failed to confirm wager on blockchain', false);
      }
    } finally {
      setIsStarting(false);
    }
  };

  // Pick a Cup at Slot Index
  const handlePickSlot = async (slotIndex: number) => {
    if (!activeGame || activeGame.status !== 'in_progress') return;
    if (phase !== 'playing') return;
    if (activeGame.pickedIndices.includes(slotIndex)) return;
    if (pickingSlot !== null) return;

    setPickingSlot(slotIndex);
    playMineTileClick();

    try {
      const res = await fetch('/api/cups/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGame.id,
          playerAddress: account,
          cupIndex: slotIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to pick cup');
      }

      const result: CupPickResult = data.result;

      if (result.hasLogo) {
        // WON!
        playMineGemReveal();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#CDB486', '#F5E6C8', '#FFFFFF'],
        });

        const updatedGame: CupsGame = {
          ...activeGame,
          status: 'won',
          pickedIndices: [...activeGame.pickedIndices, slotIndex],
          multiplier: result.multiplier,
          payout: result.payout,
          logoPosition: result.logoPosition,
          serverSeed: result.serverSeed,
          endedAt: Date.now(),
        };

        setActiveGame(null);
        setEndedGame(updatedGame);
        setLastFinishedGame(updatedGame);
        setPhase('ended');

        if (result.unclaimedGame) {
          setUnclaimedWins((prev) => [result.unclaimedGame!, ...prev]);
        }
        onShowToast(`SUCCESS! You found the KOFUKU emblem! Won ${result.payout.toLocaleString()} ${TOKEN_SYMBOL}!`, true);
      } else if (result.gameOver) {
        // LOST (all chances exhausted)
        playMineExplosion();

        const updatedGame: CupsGame = {
          ...activeGame,
          status: 'lost',
          pickedIndices: [...activeGame.pickedIndices, slotIndex],
          multiplier: 0,
          payout: 0,
          logoPosition: result.logoPosition,
          serverSeed: result.serverSeed,
          endedAt: Date.now(),
        };

        setActiveGame(null);
        setEndedGame(updatedGame);
        setLastFinishedGame(updatedGame);
        setPhase('ended');
        onShowToast(`Empty cup! The emblem was under Cup #${(result.logoPosition ?? 0) + 1}.`, false);
      } else {
        // Safe empty pick, 1 chance remaining
        playMineTileClick();
        setActiveGame((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            pickedIndices: [...prev.pickedIndices, slotIndex],
          };
        });
        onShowToast(`Empty cup! 1 pick remaining, choose wisely.`, true);
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Failed to pick cup', false);
    } finally {
      setPickingSlot(null);
    }
  };

  // Claim Winnings On-Chain
  const handleClaimWinnings = async (game: CupsGame) => {
    if (!account) return;
    setClaimingGameId(game.id);

    try {
      const prizeAmount = game.payout;
      const txHash = await claimWinnings(game.id, prizeAmount);
      if (txHash) {
        await fetch('/api/cups/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.id, claimTxHash: txHash, address: account }),
        }).catch(() => {});

        socket?.emit('cups_mark_claimed', { gameId: game.id, claimTxHash: txHash, address: account });

        setUnclaimedWins((prev) => prev.filter((g) => g.id !== game.id));
        if (endedGame && endedGame.id === game.id) {
          // Close cups back down to the table
          setEndedGame(null);
          setPhase('idle');
          setPickingSlot(null);
          playChip();
        }
        playCoinClaim();
        onShowToast(`Winnings sent to wallet! Tx: ${txHash.slice(0, 8)}...`, true);
        refreshBalances();
      }
    } catch (e: any) {
      const alreadyClaimed = await isGameClaimedOnChain(game.id);
      if (alreadyClaimed) {
        await fetch('/api/cups/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.id, claimTxHash: 'already-claimed', address: account }),
        }).catch(() => {});
        socket?.emit('cups_mark_claimed', { gameId: game.id, claimTxHash: 'already-claimed', address: account });
        setUnclaimedWins((prev) => prev.filter((g) => g.id !== game.id));
        if (endedGame && endedGame.id === game.id) {
          // Close cups back down to the table
          setEndedGame(null);
          setPhase('idle');
          setPickingSlot(null);
          playChip();
        }
        onShowToast('Prize was already claimed on-chain.', true);
        refreshBalances();
      } else {
        onShowToast(e?.message || 'Disbursement failed', false);
      }
    } finally {
      setClaimingGameId(null);
    }
  };

  // Verify Provably Fair
  const handleOpenVerify = async (gameId: string) => {
    setIsVerifying(true);
    setShowVerifyModal(true);
    try {
      const res = await fetch(`/api/cups/verify/${gameId}`);
      if (res.ok) {
        const report = await res.json();
        setVerifyReport(report);
      }
    } catch (e) {
      console.warn('Verify failed:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const isGameRunning = Boolean(activeGame && activeGame.status === 'in_progress');
  const picksLeft = activeGame ? activeGame.maxPicks - activeGame.pickedIndices.length : maxPicks;

  // Horizontal X coordinate for slot (0 = Left, 1 = Center, 2 = Right)
  const getSlotX = useCallback(
    (slotIdx: number) => {
      const spacing = isNarrowMobile ? 88 : isMobile ? 104 : 154;
      if (slotIdx === 0) return -spacing;
      if (slotIdx === 1) return 0;
      return spacing;
    },
    [isNarrowMobile, isMobile]
  );

  return (
    <div className="w-full space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          UNCLAIMED WINNINGS BANNER
          ───────────────────────────────────────────────────────────── */}
      {unclaimedWins.length > 0 && (
        <div className="rounded-2xl border border-[#CDB486]/30 bg-[#CDB486]/[0.03] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CDB486]/15 border border-[#CDB486]/30 flex items-center justify-center text-[#CDB486] shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5F7FA]">
                Unclaimed Cups Winnings Ready
              </p>
              <p className="text-xs text-[#8993A4]">
                Total:{' '}
                <span className="font-mono font-bold text-[#CDB486]">
                  {unclaimedWins.reduce((acc, g) => acc + g.payout, 0).toLocaleString()} {TOKEN_SYMBOL}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unclaimedWins.map((g) => (
              <button
                key={g.id}
                onClick={() => handleClaimWinnings(g)}
                disabled={claimingGameId === g.id}
                className="btn-liquid-glass text-xs px-4 py-2 cursor-pointer"
              >
                {claimingGameId === g.id ? 'Claiming...' : `Claim ${g.payout.toLocaleString()} ${TOKEN_SYMBOL}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          GAMEPLAY AREA (2 COLUMNS)
          LEFT: 3 LIQUID GLASS CUPS WITH AUTHENTIC SHUFFLE ANIMATION
          RIGHT: MINIMAL CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT: 3 LIQUID GLASS CUPS */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-3.5 sm:p-6 lg:p-10 rounded-3xl glass-capsule relative shadow-2xl min-h-[440px] sm:min-h-[480px]">
          {/* Ambient Glow */}
          <div className="absolute inset-8 rounded-full bg-[#CDB486]/[0.03] blur-3xl pointer-events-none" />

          {/* Table Header / Status Banner */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-4 sm:pb-6 mb-6 sm:mb-8 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#8993A4]">
                3 GLASS CUPS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#CDB486]/10 text-[#CDB486] border border-[#CDB486]/20">
                1 KOFUKU EMBLEM
              </span>
            </div>

            <div className="text-xs font-mono">
              {phase === 'revealing_start' ? (
                <span className="text-[#CDB486] font-bold animate-pulse">
                  All 3 cups opened... Observe emblem position!
                </span>
              ) : phase === 'covering' ? (
                <span className="text-[#8993A4] font-bold">
                  Cups sealed over emblem...
                </span>
              ) : phase === 'shuffling' ? (
                <span className="text-[#CDB486] font-bold animate-bounce">
                  Shuffling cups... Track the emblem!
                </span>
              ) : phase === 'playing' ? (
                <span className="text-[#CDB486] font-bold">
                  Choose 1 Cup!
                </span>
              ) : endedGame ? (
                <span className={endedGame.status === 'won' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {endedGame.status === 'won' ? 'ROUND WON' : 'ROUND OVER'}
                </span>
              ) : (
                <span className="text-[#8993A4]">Wager & Start Round</span>
              )}
            </div>
          </div>

          {/* CUPS STAGE: 3 PHYSICAL SLOTS WITH ABSOLUTE ANIMATED CUPS */}
          <div className="relative w-full max-w-[500px] h-56 sm:h-64 md:h-72 flex items-center justify-center select-none overflow-hidden sm:overflow-visible">
            {/* Table Surface Plinth */}
            <div className="absolute bottom-2 w-full h-8 rounded-full bg-black/50 blur-lg pointer-events-none" />

            {/* 3 UNDERLYING SLOTS (Fixed on table) */}
            {[-1, 0, 1].map((offset, slotIdx) => {
              // Check which cup currently occupies this slot
              const occupyingCupId = cupSlots.indexOf(slotIdx);
              const isOccupyingLogoCup = occupyingCupId === logoCupId;

              // Reveal state for the item under this slot:
              const isRevealedInStart = phase === 'revealing_start' && isOccupyingLogoCup;
              const isRevealedEmptyInPlay =
                (phase === 'playing' || phase === 'ended') &&
                activeGame?.pickedIndices.includes(slotIdx) &&
                endedGame?.logoPosition !== slotIdx;
              const isRevealedWinInEnd = endedGame && endedGame.logoPosition === slotIdx;

              return (
                <div
                  key={slotIdx}
                  style={{
                    transform: `translateX(${getSlotX(slotIdx)}px)`,
                  }}
                  className="absolute bottom-3 w-20 sm:w-24 md:w-32 flex flex-col items-center justify-center transition-transform"
                >
                  {/* Slot Target Indicator / Label */}
                  <span className="text-[10px] font-mono text-[#8993A4]/60 uppercase tracking-widest mb-1">
                    Slot #{slotIdx + 1}
                  </span>

                  {/* ITEM UNDER THE CUP */}
                  <div className="h-18 flex items-center justify-center">
                    {isRevealedInStart || isRevealedWinInEnd ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <img
                          src="/logo.png"
                          alt="KOFUKU Emblem"
                          className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain drop-shadow-[0_0_18px_rgba(205,180,134,0.9)] animate-pulse"
                        />
                        <span className="text-[9px] font-mono font-extrabold text-[#CDB486] mt-0.5 drop-shadow-sm">
                          KOFUKU
                        </span>
                      </motion.div>
                    ) : isRevealedEmptyInPlay ? (
                      <div className="flex flex-col items-center justify-center text-rose-400 py-1">
                        <X className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" />
                        <span className="text-[9px] font-mono uppercase tracking-wider font-bold">
                          EMPTY
                        </span>
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center text-white/20 font-bold text-xs">
                        ?
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 3 ANIMATED CUPS (Gliding smoothly across slots) */}
            {[0, 1, 2].map((cupId) => {
              const currentSlot = cupSlots[cupId];
              const isLogoCup = cupId === logoCupId;

              // Determine if this cup is currently lifted:
              const isSlotPicked =
                (activeGame?.pickedIndices.includes(currentSlot) ||
                  endedGame?.pickedIndices.includes(currentSlot)) ??
                false;

              const isLifted = Boolean(
                phase === 'revealing_start' ||
                (phase === 'playing' && isSlotPicked) ||
                phase === 'ended'
              );

              const isWonCup = endedGame?.status === 'won' && endedGame.logoPosition === currentSlot;
              const canClick =
                phase === 'playing' &&
                !isSlotPicked &&
                pickingSlot === null &&
                activeGame?.status === 'in_progress';

              return (
                <motion.div
                  key={cupId}
                  animate={{
                    x: getSlotX(currentSlot),
                    y: isLifted ? (isNarrowMobile ? -50 : isMobile ? -62 : -76) : 0,
                    scale: isLifted ? 1.04 : 1,
                    rotate: isWonCup ? -8 : 0,
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 1050, damping: 32, mass: 0.35 },
                    y: { type: 'spring', stiffness: 450, damping: 25 },
                  }}
                  onClick={() => canClick && handlePickSlot(currentSlot)}
                  className={`absolute bottom-3 w-20 sm:w-24 md:w-32 h-32 sm:h-38 md:h-44 rounded-t-[36px] sm:rounded-t-[42px] rounded-b-xl border flex flex-col items-center justify-between p-2 sm:p-3 z-20 transition-colors duration-300 backdrop-blur-md shadow-2xl ${
                    canClick ? 'cursor-pointer hover:border-[#CDB486]/70' : 'cursor-default'
                  } ${
                    isWonCup
                      ? 'border-[#CDB486] bg-gradient-to-b from-[#CDB486]/35 via-[#CDB486]/15 to-transparent shadow-[0_0_30px_rgba(205,180,134,0.4)]'
                      : isLifted
                      ? 'border-white/25 bg-gradient-to-b from-white/15 via-white/[0.05] to-transparent'
                      : phase === 'shuffling'
                      ? 'border-[#CDB486]/50 bg-gradient-to-b from-white/20 via-white/[0.08] to-transparent'
                      : 'border-white/15 bg-gradient-to-b from-white/15 via-white/[0.05] to-transparent'
                  }`}
                  style={{
                    boxShadow: isWonCup
                      ? '0 12px 40px rgba(205, 180, 134, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.4)'
                      : '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {/* Top Rim Specular */}
                  <div className="w-10 sm:w-16 h-1.5 sm:h-2 rounded-full border border-white/40 bg-white/20 shadow-sm" />

                  {/* Center Emblem Glow */}
                  <div className="flex flex-col items-center justify-center opacity-60">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-[#CDB486]/40 flex items-center justify-center text-[#CDB486]">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </div>
                  </div>

                  {/* Bottom Champagne Rim */}
                  <div className="w-full h-1 sm:h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#CDB486]/50 to-transparent" />
                </motion.div>
              );
            })}
          </div>

          {/* Action / Selection Buttons Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[480px] pt-3 sm:pt-4 select-none">
            {[0, 1, 2].map((slotIdx) => {
              const isSlotPicked =
                activeGame?.pickedIndices.includes(slotIdx) ||
                endedGame?.pickedIndices.includes(slotIdx);
              const isPickingThis = pickingSlot === slotIdx;
              const canClick =
                phase === 'playing' &&
                !isSlotPicked &&
                pickingSlot === null &&
                activeGame?.status === 'in_progress';

              return (
                <div key={slotIdx} className="flex flex-col items-center">
                  {isPickingThis ? (
                    <span className="flex items-center gap-1 text-xs text-[#CDB486] font-mono py-1.5">
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening...</span>
                    </span>
                  ) : canClick ? (
                    <button
                      type="button"
                      onClick={() => handlePickSlot(slotIdx)}
                      className="w-full py-1.5 sm:py-2 rounded-xl border border-[#CDB486]/50 bg-[#CDB486]/10 hover:bg-[#CDB486]/25 text-[#CDB486] font-mono text-[10px] sm:text-xs font-bold uppercase transition-all shadow-md cursor-pointer hover:scale-[1.02]"
                    >
                      PICK #{slotIdx + 1}
                    </button>
                  ) : isSlotPicked ? (
                    <span className="text-xs font-mono text-[#8993A4] py-1.5 font-semibold">
                      REVEALED
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-white/20 py-1.5">
                      CUP #{slotIdx + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Minimal Tactile Legend */}
          <div className="mt-6 sm:mt-8 pt-4 border-t border-white/10 w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#8993A4]">
            <span className="flex items-center gap-2">
              <img src="/logo.png" alt="KOFUKU" className="w-4 h-4 object-contain" />
              Winning Cup = <strong className="text-[#CDB486]">KOFUKU Emblem</strong>
            </span>
            <span className="flex items-center gap-2">
              <X className="w-4 h-4 text-rose-400" />
              Empty Cup = <strong className="text-[#8993A4]">Miss</strong>
            </span>
          </div>
        </div>

        {/* RIGHT: LIQUID GLASS CONTROLS */}
        <div className="lg:col-span-5 p-4 sm:p-6 lg:p-8 rounded-3xl glass-capsule space-y-4 sm:space-y-6 shadow-2xl">
          {/* BET INPUT */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#8993A4] tracking-wide uppercase">BET</span>
              <span className="text-[#8993A4]">
                Balance:{' '}
                <strong className="font-mono text-[#F5F7FA]">
                  {usdgBalance.toLocaleString()} {TOKEN_SYMBOL}
                </strong>
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="10000"
                min="100000"
                max="10000000"
                disabled={isGameRunning}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(100000, parseFloat(e.target.value) || 0))}
                className="glass-input w-full px-3.5 sm:px-4 py-3 sm:py-3.5 font-mono text-base sm:text-lg font-bold text-[#F5F7FA] transition-colors disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8993A4]">
                {TOKEN_SYMBOL}
              </span>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amtObj) => (
                <button
                  key={amtObj.val}
                  type="button"
                  disabled={isGameRunning}
                  onClick={() => setBetAmount(amtObj.val)}
                  className={`py-1.5 sm:py-2 px-1 text-[10px] sm:text-xs font-mono font-medium transition-all cursor-pointer disabled:opacity-40 ${
                    betAmount === amtObj.val
                      ? 'glass-btn-chip border-[#CDB486]/60 text-[#CDB486] shadow-[0_0_12px_rgba(205,180,134,0.25)]'
                      : 'glass-btn-chip text-[#8993A4] hover:text-[#F5F7FA]'
                  }`}
                >
                  {amtObj.label}
                </button>
              ))}
            </div>
          </div>

          {/* GAMEPLAY RULES */}
          <div className="space-y-1.5 pt-2 border-t border-white/10 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#8993A4] tracking-wide uppercase">RULES</span>
              <span className="text-xs font-mono text-[#CDB486]">1 Pick (2.94× Payout)</span>
            </div>
            <p className="text-xs text-[#8993A4] leading-relaxed">
              Track the cups during the shuffle. Pick the 1 cup concealing the KOFUKU emblem to win 2.94× your wager.
            </p>
          </div>

          {/* MULTIPLIER & POTENTIAL WIN */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10 text-left">
            <div>
              <span className="text-[11px] font-medium text-[#8993A4] tracking-wider uppercase block">
                MULTIPLIER
              </span>
              <span className="font-mono text-2xl font-extrabold text-[#CDB486]">
                {currentMultiplier.toFixed(2)}×
              </span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-[#8993A4] tracking-wider uppercase block">
                POTENTIAL WIN
              </span>
              <span className="font-mono text-2xl font-extrabold text-[#E5C07B]">
                {potentialWin.toLocaleString()} <span className="text-xs text-[#8993A4]">{TOKEN_SYMBOL}</span>
              </span>
            </div>
          </div>

          {/* START BUTTON */}
          <div className="pt-2">
            {isGameRunning ? (
              <div className="p-4 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/30 text-center space-y-1">
                <p className="text-xs font-mono font-bold text-[#CDB486] uppercase tracking-wider">
                  {phase === 'revealing_start'
                    ? 'ALL CUPS OPENED'
                    : phase === 'shuffling'
                    ? 'SHUFFLING CUPS...'
                    : 'PICK A CUP'}
                </p>
                <p className="text-xs text-[#8993A4]">
                  {phase === 'revealing_start'
                    ? 'Notice where the emblem is placed...'
                    : phase === 'shuffling'
                    ? 'Track the cup with your eyes!'
                    : 'Touch any cup on the left to uncover the KOFUKU emblem.'}
                </p>
              </div>
            ) : endedGame && endedGame.status === 'won' && !endedGame.isClaimed ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleClaimWinnings(endedGame)}
                  disabled={claimingGameId === endedGame.id}
                  className="glass-btn-inflated w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl !bg-[#CDB486] !text-black hover:!bg-[#F5E6C8]"
                >
                  {claimingGameId === endedGame.id ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>CLAIMING REWARD...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>CLAIM WINNINGS ({endedGame.payout.toLocaleString()} {TOKEN_SYMBOL})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="w-full py-2.5 rounded-xl border border-white/10 hover:border-[#CDB486]/40 text-xs font-mono text-[#8993A4] hover:text-[#F5F7FA] transition-colors cursor-pointer"
                >
                  Start New Round (Claim Later)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={isStarting}
                className="glass-btn-inflated w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xl"
              >
                {isStarting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>CONFIRMING IN WALLET...</span>
                  </>
                ) : (
                  <span>START ROUND ({betAmount.toLocaleString()} {TOKEN_SYMBOL})</span>
                )}
              </button>
            )}
          </div>

          {/* Provably Fair Minimal Link */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#8993A4]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#CDB486]" />
              <span className="text-[11px]">HMAC-SHA256 Provably Fair</span>
            </span>

            {lastFinishedGame && (
              <button
                type="button"
                onClick={() => handleOpenVerify(lastFinishedGame.id)}
                className="text-[11px] font-mono text-[#CDB486] hover:underline cursor-pointer"
              >
                Verify Round #{lastFinishedGame.id.slice(-5)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PROVABLY FAIR VERIFICATION MODAL
          ───────────────────────────────────────────────────────────── */}
      {mounted && showVerifyModal && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl glass-capsule border border-white/10 p-6 sm:p-8 space-y-6 text-left shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#CDB486]" />
                  <h3 className="text-base font-bold text-[#F5F7FA]">
                    Provably Fair Verification
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="p-1 text-[#8993A4] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isVerifying ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RotateCcw className="w-6 h-6 animate-spin text-[#CDB486]" />
                  <span className="text-xs text-[#8993A4]">Verifying cryptographic hashes...</span>
                </div>
              ) : verifyReport ? (
                <div className="space-y-4 text-xs">
                  <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    verifyReport.allPassed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {verifyReport.allPassed ? (
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">
                        {verifyReport.allPassed ? '100% Cryptographically Verified' : 'Verification Mismatch'}
                      </p>
                      <p className="text-[11px] opacity-80">
                        The emblem position and shuffle path were pre-determined and unmanipulated.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono">
                    <div>
                      <span className="text-[#8993A4] block text-[10px] uppercase">SHA-256 Server Seed Hash</span>
                      <p className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-[#F5F7FA] break-all select-all">
                        {verifyReport.expectedServerSeedHash}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#8993A4] block text-[10px] uppercase">Calculated Hash</span>
                      <p className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-[#CDB486] break-all select-all">
                        {verifyReport.calculatedServerSeedHash}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[#8993A4] block text-[10px] uppercase">Calculated Cup Slot</span>
                        <p className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-sm font-bold text-[#F5F7FA]">
                          Cup #{verifyReport.calculatedLogoPosition + 1}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#8993A4] block text-[10px] uppercase">Actual Revealed Slot</span>
                        <p className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-sm font-bold text-[#CDB486]">
                          Cup #{verifyReport.actualLogoPosition + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#8993A4]">
                  Verification details are only available for completed rounds.
                </p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="glass-btn-chip w-full py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
