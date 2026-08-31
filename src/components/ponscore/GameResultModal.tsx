'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Zap, ShieldCheck, Check, ExternalLink, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { usePonscoreWeb3 } from '@/context/PonscoreWeb3Context';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';

interface GameResultModalProps {
  isOpen: boolean;
  game: any | null;
  onClose: () => void;
  onOpenVerify: (gameId: string) => void;
  onClaimSuccess?: (gameId: string, txHash: string) => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  game,
  onClose,
  onOpenVerify,
  onClaimSuccess,
}) => {
  const { account, claimWinnings, txState, lastTxHash } = usePonscoreWeb3();
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'unclaimed' | 'claiming' | 'confirmed' | 'paid'>('unclaimed');
  const [claimTx, setClaimTx] = useState<string | null>(null);

  const winner = game?.winner;
  const isWinner = account && winner && account.toLowerCase() === winner.address.toLowerCase();

  useEffect(() => {
    if (isOpen && winner) {
      if (isWinner) {
        confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.4 },
          colors: ['#00f0ff', '#10b981', '#38bdf8', '#ffffff'],
        });
      }
      setClaimStatus(winner.claimed ? 'paid' : 'unclaimed');
      setClaimTx(winner.claimTxHash || null);
    }
  }, [isOpen, winner, isWinner]);

  if (!isOpen || !game || !winner || !isWinner) return null;

  const handleClaim = async () => {
    if (!isWinner || claiming) return;
    setClaiming(true);
    setClaimStatus('claiming');

    try {
      const hash = await claimWinnings(
        game.gameId,
        winner?.prizePons,
        game.revealedServerSeed || '',
        game.serverSeedHash || ''
      );
      if (hash) {
        setClaimTx(hash);
        setClaimStatus('confirmed');
        if (onClaimSuccess) {
          onClaimSuccess(game.gameId, hash);
        }
        setTimeout(() => setClaimStatus('paid'), 2500);
      } else {
        setClaimStatus('unclaimed');
      }
    } catch (e) {
      console.error('Claim error:', e);
      setClaimStatus('unclaimed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#F5F8F3]/95 dark:bg-[#0c1611]/95 border-2 border-white/90 dark:border-[#718D76]/40 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden backdrop-blur-2xl text-[#243329] dark:text-[#F5F8F3] select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient sage soft glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#718D76]/15 dark:bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy / Status Icon */}
          <div
            className={`w-18 h-18 p-3 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md ${
              isWinner
                ? 'bg-[#718D76] text-[#F5F8F3]'
                : 'bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/35 text-[#526256] dark:text-slate-300'
            }`}
          >
            {isWinner ? <Trophy className="w-9 h-9" /> : <ShieldCheck className="w-8 h-8 text-[#718D76] dark:text-emerald-400" />}
          </div>

          <div className="text-[10px] font-black text-[#718D76] dark:text-emerald-400 uppercase tracking-[0.25em] mb-1 font-mono">
            GAME OVER • {game.gameId}
          </div>

          {isWinner ? (
            <h2 className="text-xl font-black text-[#243329] dark:text-white tracking-tight mb-1">
              CONGRATULATIONS! YOU WON!
            </h2>
          ) : (
            <h2 className="text-lg font-black text-[#526256] dark:text-slate-300 tracking-tight mb-1">
              YOU DID NOT WIN
            </h2>
          )}

          {/* Winner Profile */}
          <div className="p-3 bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/35 rounded-2xl mb-3 space-y-1 text-xs font-mono">
            <span className="text-[#526256] dark:text-slate-400 text-[10px]">WINNER WALLET:</span>
            <p className="text-[#243329] dark:text-white font-bold truncate">
              {winner.address.slice(0, 10)}...{winner.address.slice(-8)}
              {isWinner && <span className="text-[#718D76] dark:text-emerald-400 ml-1 font-black">(You)</span>}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#526256] dark:text-slate-400 pt-1 border-t border-white/60 dark:border-white/10">
              <span>Winning Ticket:</span>
              <span className="font-bold text-[#718D76] dark:text-emerald-400">#{winner.winningTicket}</span>
            </div>
          </div>

          {/* Prize Breakdown (95% Winner, 5% Platform Fee) */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-[#122019]/80 border border-white/90 dark:border-[#718D76]/40 mb-3 shadow-sm">
            <p className="text-[10px] font-mono text-[#526256] dark:text-slate-400 uppercase tracking-wider mb-0.5">PRIZE WON (NET 95%)</p>
            <div className="text-3xl font-black text-[#243329] dark:text-emerald-300 font-mono tracking-tight flex items-center justify-center gap-1">
              <span>{winner.prizePons.toLocaleString()}</span>
              <span className="text-sm text-[#718D76] dark:text-emerald-400 font-bold">PONSPOT</span>
            </div>
            <div className="flex items-center justify-around text-[10px] text-[#526256] dark:text-slate-400 font-mono pt-2 mt-2 border-t border-white/60 dark:border-white/10">
              <span>Total Pool: {winner.totalPoolPons.toLocaleString()}</span>
              <span>•</span>
              <span>Fee (5%): {winner.feePons.toLocaleString()}</span>
            </div>
          </div>

          {/* Winner Claim Section */}
          {isWinner ? (
            <div className="space-y-2 mb-3">
              {/* Claim Status Lifecycle Indicator */}
              <div className="flex items-center justify-between px-2 py-1 bg-white/60 dark:bg-[#0c1611]/80 border border-white/80 dark:border-[#718D76]/30 rounded-xl text-[9px] font-mono font-bold">
                <span className={claimStatus === 'unclaimed' ? 'text-amber-800 dark:text-amber-300' : 'text-[#526256] dark:text-slate-500'}>
                  UNCLAIMED
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-[#526256]/50 dark:text-slate-500" />
                <span className={claimStatus === 'claiming' ? 'text-[#718D76] dark:text-emerald-400 animate-pulse' : 'text-[#526256] dark:text-slate-500'}>
                  CLAIM TX
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-[#526256]/50 dark:text-slate-500" />
                <span className={claimStatus === 'confirmed' ? 'text-teal-800 dark:text-teal-300 animate-pulse' : 'text-[#526256] dark:text-slate-500'}>
                  CONFIRMED
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-[#526256]/50 dark:text-slate-500" />
                <span className={claimStatus === 'paid' ? 'text-[#718D76] dark:text-emerald-400' : 'text-[#526256] dark:text-slate-500'}>
                  PAID
                </span>
              </div>

              {claimStatus === 'paid' ? (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>PRIZE ALREADY PAID OUT ON-CHAIN</span>
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={claiming || claimStatus !== 'unclaimed'}
                  className="btn-primary-sage w-full py-3.5 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 tracking-wider"
                >
                  {claiming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>SIGNING ON-CHAIN CLAIM...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>CLAIM WINNINGS [ SIGN TRANSACTION ]</span>
                    </>
                  )}
                </button>
              )}

              {claimTx && (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${claimTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#718D76] dark:text-emerald-400 hover:underline font-mono"
                >
                  <span>Cek Payout Claim di Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-white/50 dark:bg-[#101c16]/60 rounded-xl border border-white/70 dark:border-[#718D76]/25 text-[10px] text-[#526256] dark:text-slate-300 font-mono mb-3">
              Klaim hadiah hanya dapat dilakukan oleh dompet pemenang.
            </div>
          )}

          {/* Action Footer */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenVerify(game.gameId);
              }}
              className="flex-1 py-2.5 btn-secondary-glass rounded-xl text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#718D76] dark:text-emerald-400" />
              <span>VERIFY RESULT</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/60 dark:bg-white/10 hover:bg-white/85 dark:hover:bg-white/20 text-[#526256] dark:text-slate-300 hover:text-[#243329] dark:hover:text-white border border-white/80 dark:border-white/15 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
