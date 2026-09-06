'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { MinesGame, MinesTileResult, MinesCashoutResult, MinesVerifyReport } from '@/types/mines';

interface MinesArenaProps {
  account: string | null;
  usdgBalance: number;
  userProfile: { name: string; avatar: string };
  onOpenWalletModal: () => void;
  onShowToast: (msg: string, ok?: boolean) => void;
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export const MinesArena: React.FC<MinesArenaProps> = ({
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
    playMineCashout,
  } = useSound();
  const { placeBet, claimWinnings, refreshBalances } = useCashFlipWeb3();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wager & Mines configuration (Fixed 5x5 Matrix, 25 tiles)
  const totalTiles = 25;
  const maxMines = 24;
  const [betAmount, setBetAmount] = useState<number>(10);
  const [mineCount, setMineCount] = useState<number>(3); // Default 3 mines for 5x5

  // Active game state
  const [activeGame, setActiveGame] = useState<MinesGame | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);

  // Completed round reveal & history
  const [endedGame, setEndedGame] = useState<MinesGame | null>(null);
  const [unclaimedWins, setUnclaimedWins] = useState<MinesGame[]>([]);
  const [claimingGameId, setClaimingGameId] = useState<string | null>(null);

  // Provably Fair Modal
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifyReport, setVerifyReport] = useState<MinesVerifyReport | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Sync active game & unclaimed games
  const syncGameState = useCallback(async () => {
    if (!account) return;
    try {
      const actRes = await fetch(`/api/mines/active/${account}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        if (actData && actData.status === 'in_progress') {
          setActiveGame(actData);
          setBetAmount(actData.betAmount);
          setMineCount(actData.mineCount);
        } else {
          setActiveGame(null);
        }
      }

      const uncRes = await fetch(`/api/mines/unclaimed/${account}`);
      if (uncRes.ok) {
        const uncData = await uncRes.json();
        if (Array.isArray(uncData)) {
          setUnclaimedWins(uncData);
        }
      }
    } catch (e) {
      console.warn('Could not sync mines game state:', e);
    }
  }, [account]);

  useEffect(() => {
    syncGameState();
  }, [syncGameState]);

  // Handle Socket Events
  useEffect(() => {
    if (!socket) return;
    const handleUnclaimed = (list: MinesGame[]) => {
      if (Array.isArray(list)) setUnclaimedWins(list);
    };
    socket.on('mines_unclaimed', handleUnclaimed);
    return () => {
      socket.off('mines_unclaimed', handleUnclaimed);
    };
  }, [socket]);

  // Prospective multiplier calculation
  const prospectiveMultiplier = useMemo(() => {
    const totalSafe = totalTiles - mineCount;
    const fair = totalTiles / Math.max(1, totalSafe);
    return Math.max(1.01, Math.floor(fair * 0.98 * 100) / 100);
  }, [totalTiles, mineCount]);

  // Start Game with Wallet Confirmation on Robinhood Chain
  const handleStartGame = async () => {
    if (!account) {
      onOpenWalletModal();
      return;
    }
    if (betAmount < 0.5) {
      onShowToast('Minimum wager is 0.5 USDG', false);
      return;
    }
    if (usdgBalance < betAmount) {
      onShowToast(`Insufficient USDG balance (${usdgBalance.toFixed(2)} available)`, false);
      return;
    }

    setIsStarting(true);
    setEndedGame(null);

    try {
      const customId = `mines_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // 1. Confirm stake on-chain with player's wallet
      onShowToast('Please confirm the wager transaction in your wallet...', true);
      const txHash = await placeBet(customId, betAmount);

      if (!txHash) {
        throw new Error('Transaction was cancelled or rejected in wallet.');
      }

      // 2. Start game on backend with verified transaction hash
      const res = await fetch('/api/mines/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: account,
          playerName: userProfile?.name || `${account.slice(0, 6)}...${account.slice(-4)}`,
          betAmount,
          mineCount,
          playerAvatar: userProfile?.avatar,
          gridSize: totalTiles,
          gameId: customId,
          txHash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start game');
      }

      setActiveGame(data.game);
      await refreshBalances();
      onShowToast(`Wager of ${betAmount} USDG confirmed on Robinhood Chain! Touch a capsule to reveal.`, true);
    } catch (e: any) {
      console.error('Mines start error:', e);
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

  // Reveal Tile
  const handleTileClick = async (tileIndex: number) => {
    if (!activeGame || activeGame.status !== 'in_progress') return;
    if (activeGame.revealedIndices.includes(tileIndex)) return;
    if (revealingIndex !== null) return;

    setRevealingIndex(tileIndex);
    playMineTileClick();

    try {
      const res = await fetch('/api/mines/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGame.id,
          playerAddress: account,
          tileIndex,
        }),
      });

      const data: MinesTileResult = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to reveal tile');
      }

      if (data.isMine) {
        playMineExplosion();
        onShowToast('DEMOLITION! Glass capsule shattered.', false);

        const bustedGame: MinesGame = {
          ...activeGame,
          status: 'busted',
          revealedIndices: [...activeGame.revealedIndices, tileIndex],
          currentMultiplier: 0,
          currentPayout: 0,
          minePositions: data.minePositions,
          serverSeed: data.serverSeed,
        };
        setActiveGame(null);
        setEndedGame(bustedGame);
      } else {
        const newRevealed = [...activeGame.revealedIndices, tileIndex];
        playMineGemReveal(newRevealed.length);

        if (data.status === 'cashed_out') {
          playMineCashout();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          onShowToast(`ALL SAFE CAPSULES REVEALED: +${data.payout.toFixed(2)} USDG!`, true);

          const maxWinGame: MinesGame = {
            ...activeGame,
            status: 'cashed_out',
            revealedIndices: newRevealed,
            currentMultiplier: data.multiplier,
            currentPayout: data.payout,
            minePositions: data.minePositions,
            serverSeed: data.serverSeed,
            isClaimed: false,
          };
          setActiveGame(null);
          setEndedGame(maxWinGame);
          if (data.unclaimedGame) {
            setUnclaimedWins((prev) => [data.unclaimedGame!, ...prev]);
          }
        } else {
          setActiveGame({
            ...activeGame,
            revealedIndices: newRevealed,
            currentMultiplier: data.multiplier,
            currentPayout: data.payout,
            nextMultiplier: data.nextMultiplier,
          });
        }
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Error revealing capsule', false);
    } finally {
      setRevealingIndex(null);
    }
  };

  // Cashout
  const handleCashout = async () => {
    if (!activeGame || activeGame.status !== 'in_progress') return;
    if (activeGame.revealedIndices.length === 0) {
      onShowToast('Reveal at least 1 safe capsule before cashing out', false);
      return;
    }

    setIsCashingOut(true);
    try {
      const res = await fetch('/api/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGame.id,
          playerAddress: account,
        }),
      });

      const data: MinesCashoutResult = await res.json();
      if (!res.ok || !data.success) {
        throw new Error((data as any).error || 'Failed to cash out');
      }

      playMineCashout();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onShowToast(`CASHED OUT: +${data.payout.toFixed(2)} USDG (${data.multiplier.toFixed(2)}x)!`, true);

      const cashedGame: MinesGame = {
        ...activeGame,
        status: 'cashed_out',
        currentMultiplier: data.multiplier,
        currentPayout: data.payout,
        minePositions: data.minePositions,
        serverSeed: data.serverSeed,
        isClaimed: false,
      };

      setActiveGame(null);
      setEndedGame(cashedGame);
      if (data.unclaimedGame) {
        setUnclaimedWins((prev) => [data.unclaimedGame!, ...prev]);
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Cash out failed', false);
    } finally {
      setIsCashingOut(false);
    }
  };

  // On-Chain Claim Winnings
  const handleClaimWinnings = async (game: MinesGame) => {
    if (!account) return;
    setClaimingGameId(game.id);

    try {
      const prizeAmount = game.currentPayout;
      const txHash = await claimWinnings(game.id, prizeAmount);
      if (txHash) {
        await fetch('/api/mines/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: game.id, claimTxHash: txHash, address: account }),
        }).catch(() => {});

        setUnclaimedWins((prev) => prev.filter((g) => g.id !== game.id));
        if (endedGame && endedGame.id === game.id) {
          setEndedGame({ ...endedGame, isClaimed: true, claimTxHash: txHash });
        }
        onShowToast(`Winnings sent to wallet! Tx: ${txHash.slice(0, 8)}...`, true);
        refreshBalances();
      }
    } catch (e: any) {
      onShowToast(e?.message || 'Disbursement failed', false);
    } finally {
      setClaimingGameId(null);
    }
  };

  // Verify Provably Fair
  const handleOpenVerify = async (gameId: string) => {
    setIsVerifying(true);
    setShowVerifyModal(true);
    try {
      const res = await fetch(`/api/mines/verify/${gameId}`);
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
  const currentMultiplier = (activeGame && isGameRunning) ? activeGame.currentMultiplier : 1.0;
  const potentialWin = (activeGame && isGameRunning)
    ? activeGame.currentPayout
    : Math.round(betAmount * prospectiveMultiplier * 100) / 100;

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
                Unclaimed Winnings Ready
              </p>
              <p className="text-xs text-[#8993A4]">
                Total:{' '}
                <span className="font-mono font-bold text-[#CDB486]">
                  {unclaimedWins.reduce((acc, g) => acc + g.currentPayout, 0).toFixed(2)} USDG
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
                className="btn-liquid-glass text-xs px-4 py-2"
              >
                {claimingGameId === g.id ? 'Claiming...' : `Claim ${g.currentPayout.toFixed(2)} USDG`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          GAMEPLAY AREA (2 COLUMNS)
          LEFT: TACTILE LIQUID GLASS CAPSULE GRID
          RIGHT: MINIMAL CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT: LIQUID GLASS CAPSULE GRID */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl glass-capsule relative shadow-2xl">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-8 rounded-full bg-[#CDB486]/[0.03] blur-3xl pointer-events-none" />

          {/* Grid Header */}
          <div className="w-full flex items-center justify-between pb-5 mb-5 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-widest text-[#8993A4]">
              5×5 MATRIX (25 CAPSULES)
            </span>
          </div>

          {/* Liquid Glass Capsule Grid (Fixed 5x5) */}
          <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-w-[440px] w-full aspect-square select-none">
            {Array.from({ length: totalTiles }).map((_, index) => {
              const isRevealedByPlayer = activeGame?.revealedIndices.includes(index) || false;
              const isEndedGameMine = endedGame?.minePositions?.includes(index) || false;
              const isEndedGameRevealed = endedGame?.revealedIndices.includes(index) || false;
              const isEnded = !!endedGame;

              let tileClass = 'liquid-glass-tile';
              let tileContent: React.ReactNode = (
                <span className="font-sans font-extrabold text-lg sm:text-2xl text-white/40 group-hover:text-white/80 transition-colors drop-shadow-sm">
                  ?
                </span>
              );

              if (isGameRunning) {
                if (isRevealedByPlayer) {
                  // Safe glass capsule reveal
                  tileClass = 'liquid-glass-tile-safe';
                  tileContent = (
                    <motion.div
                      initial={{ scale: 0, rotate: -25 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                      className="flex items-center justify-center p-2"
                    >
                      <img
                        src="/image/safe.png"
                        alt="Safe Diamond"
                        className="w-8 h-8 sm:w-11 sm:h-11 object-contain drop-shadow-[0_0_12px_rgba(205,180,134,0.7)]"
                      />
                    </motion.div>
                  );
                }
              } else if (isEnded) {
                if (isEndedGameMine) {
                  const wasBustTile = endedGame.status === 'busted' && isEndedGameRevealed;
                  tileClass = wasBustTile ? 'liquid-glass-tile-busted' : 'bg-rose-950/20 border border-rose-500/30';
                  tileContent = (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center p-2"
                    >
                      <img
                        src="/image/bom.png"
                        alt="Mine Bomb"
                        className={`w-8 h-8 sm:w-11 sm:h-11 object-contain drop-shadow-[0_0_14px_rgba(244,63,94,0.9)] ${
                          wasBustTile ? 'scale-110 animate-bounce' : 'opacity-80'
                        }`}
                      />
                    </motion.div>
                  );
                } else if (isEndedGameRevealed) {
                  tileClass = 'liquid-glass-tile-safe';
                  tileContent = (
                    <div className="flex items-center justify-center p-2">
                      <img
                        src="/image/safe.png"
                        alt="Safe Diamond"
                        className="w-8 h-8 sm:w-11 sm:h-11 object-contain drop-shadow-[0_0_12px_rgba(205,180,134,0.7)]"
                      />
                    </div>
                  );
                } else {
                  tileClass = 'bg-white/[0.02] border border-white/[0.04] opacity-50';
                  tileContent = (
                    <Sparkles className="w-5 h-5 text-[#CDB486]/40" />
                  );
                }
              }

              const isTileDisabled =
                !isGameRunning ||
                isRevealedByPlayer ||
                revealingIndex !== null;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={isTileDisabled}
                  onClick={() => handleTileClick(index)}
                  className={`group rounded-2xl flex items-center justify-center cursor-pointer disabled:cursor-default transition-all duration-300 ${tileClass}`}
                >
                  {revealingIndex === index ? (
                    <RotateCcw className="w-5 h-5 animate-spin text-[#CDB486]" />
                  ) : (
                    tileContent
                  )}
                </button>
              );
            })}
          </div>

          {/* Minimal Tactile Legend */}
          <div className="mt-6 text-xs text-[#8993A4] flex items-center gap-6">
            <span className="flex items-center gap-2">
              <img src="/image/safe.png" alt="Safe" className="w-5 h-5 object-contain" />
              Safe = <strong className="text-[#F5F0E6]">Diamond</strong>
            </span>
            <span className="flex items-center gap-2">
              <img src="/image/bom.png" alt="Bomb" className="w-5 h-5 object-contain" />
              Mine = <strong className="text-rose-400">Bomb</strong>
            </span>
          </div>
        </div>

        {/* RIGHT: LIQUID GLASS CONTROLS */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl glass-capsule space-y-6 shadow-2xl">
          {/* BET INPUT */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#8993A4] tracking-wide uppercase">BET</span>
              <span className="text-[#8993A4]">
                Balance: <strong className="font-mono text-[#F5F7FA]">{usdgBalance.toFixed(2)} USDG</strong>
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="1"
                min="0.5"
                max="1000"
                disabled={isGameRunning}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="glass-input w-full px-4 py-3.5 font-mono text-lg font-bold text-[#F5F7FA] transition-colors disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8993A4]">
                USDG
              </span>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isGameRunning}
                  onClick={() => setBetAmount(amt)}
                  className={`py-2 text-xs font-mono font-medium transition-all cursor-pointer disabled:opacity-40 ${
                    betAmount === amt
                      ? 'glass-btn-chip border-[#CDB486]/60 text-[#CDB486] shadow-[0_0_12px_rgba(205, 180, 134,0.25)]'
                      : 'glass-btn-chip text-[#8993A4] hover:text-[#F5F7FA]'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* MINES CONTROLS */}
          <div className="space-y-2 pt-2 border-t border-white/10 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#8993A4] tracking-wide uppercase">MINES</span>
              <span className="text-xs font-mono text-[#CDB486]">{mineCount} Mines / {totalTiles - mineCount} Safe</span>
            </div>

            {/* Quick Presets for 5x5 Matrix */}
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 24].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isGameRunning}
                  onClick={() => setMineCount(num)}
                  className={`py-2 font-mono text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                    mineCount === num
                      ? 'glass-btn-chip border-[#CDB486] text-[#CDB486] shadow-[0_0_14px_rgba(205, 180, 134,0.35)]'
                      : 'glass-btn-chip text-[#8993A4] hover:text-[#F5F7FA]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Smooth Range Slider */}
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="1"
                max={maxMines}
                value={mineCount}
                disabled={isGameRunning}
                onChange={(e) => setMineCount(parseInt(e.target.value, 10))}
                className="w-full accent-[#CDB486] bg-white/[0.05] h-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              />
              <span className="font-mono text-xs font-bold text-[#F5F7FA] w-6 text-right">
                {mineCount}
              </span>
            </div>
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
                {potentialWin.toFixed(2)} <span className="text-xs text-[#8993A4]">USDG</span>
              </span>
            </div>
          </div>

          {/* MAIN BUTTON: [ START GAME ] / [ CASH OUT ] */}
          <div className="pt-2">
            {isGameRunning && activeGame ? (
              <button
                type="button"
                onClick={handleCashout}
                disabled={isCashingOut || activeGame.revealedIndices.length === 0}
                className="glass-btn-inflated w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-xl"
              >
                {isCashingOut ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Cashing Out...</span>
                  </>
                ) : (
                  <span>
                    CASH OUT {activeGame.currentPayout.toFixed(2)} USDG ({activeGame.currentMultiplier.toFixed(2)}×)
                  </span>
                )}
              </button>
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
                  <span>START GAME ({betAmount} USDG)</span>
                )}
              </button>
            )}
          </div>

          {/* Provably Fair Minimal Link */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#8993A4]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#CDB486]" />
              <span>Provably Fair (HMAC-SHA256)</span>
            </span>
            {endedGame && (
              <button
                type="button"
                onClick={() => handleOpenVerify(endedGame.id)}
                className="text-[#CDB486] hover:underline cursor-pointer"
              >
                Verify Round
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Provably Fair Modal */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showVerifyModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#030508]/85 backdrop-blur-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="w-full max-w-lg glass-capsule rounded-3xl border border-white/10 p-6 sm:p-7 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.15)] text-[#F5F7FA] font-sans"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CDB486] font-bold">
                      CRYPTOGRAPHIC AUDIT
                    </span>
                    <h3 className="font-heading text-lg font-bold text-[#F5F7FA] uppercase">
                      PROVABLY FAIR VERIFICATION
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isVerifying ? (
                  <div className="py-8 text-center text-sm text-[#8993A4]">
                    <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#CDB486] mb-2" />
                    Verifying cryptographic hashes...
                  </div>
                ) : verifyReport ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl glass-capsule border border-white/[0.06] space-y-1">
                      <span className="text-[#8993A4] block text-[10px] font-mono uppercase tracking-wider">STATUS</span>
                      <span className={`font-semibold ${verifyReport.allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {verifyReport.allPassed ? '✓ Cryptographically Valid & Untampered' : 'Verification Mismatch'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl glass-capsule border border-white/[0.06] space-y-1">
                      <span className="text-[#8993A4] block text-[10px] font-mono uppercase tracking-wider">SERVER SEED HASH</span>
                      <span className="font-mono text-[#F5F7FA] break-all text-[11px]">
                        {verifyReport.expectedServerSeedHash}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl glass-capsule border border-white/[0.06] space-y-1">
                      <span className="text-[#8993A4] block text-[10px] font-mono uppercase tracking-wider">MINE POSITIONS</span>
                      <span className="font-mono text-[#CDB486] font-bold">
                        Tiles: {verifyReport.actualMinePositions.join(', ')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#8993A4]">No verification data available.</p>
                )}

                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="w-full py-3 glass-btn-chip rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer text-[#8993A4] hover:text-[#F5F7FA]"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
