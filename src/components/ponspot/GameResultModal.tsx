'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Zap, ShieldCheck, Check, ExternalLink, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { usePonspotWeb3 } from '@/context/PonspotWeb3Context';
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
  const { account, claimWinnings, txState, lastTxHash } = usePonspotWeb3();
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
        winner?.totalPoolPons,   // Pass total pool (100%), contract splits 5% burn / 95% winner internally
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
          className="bg-[#060b17]/98 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(0,240,255,0.3)] rounded-2xl p-6 max-w-sm w-full text-center relative overflow-hidden backdrop-blur-2xl text-white select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient neon cyan glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00f0ff]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy / Status Icon */}
          <div
            className={`w-16 h-16 p-3 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,255,136,0.4)] ${
              isWinner
                ? 'bg-gradient-to-br from-emerald-500 to-[#00ff88] text-black'
                : 'bg-[#091224] border border-cyan-500/30 text-cyan-400'
            }`}
          >
            {isWinner ? <Trophy className="w-8 h-8 text-black" /> : <ShieldCheck className="w-8 h-8 text-[#00f0ff]" />}
          </div>

          <div className="text-[10px] font-black text-[#00f0ff] uppercase tracking-[0.25em] mb-1 font-mono">
            ROUND SETTLED // {game.gameId}
          </div>

          {isWinner ? (
            <h2 className="text-xl font-black text-white tracking-tight mb-1 font-orbitron text-neon-green">
              CONGRATULATIONS! YOU WON!
            </h2>
          ) : (
            <h2 className="text-lg font-black text-slate-300 tracking-tight mb-1 font-orbitron">
              ROUND CONCLUDED
            </h2>
          )}

          {/* Winner Profile */}
          <div className="p-3 bg-[#091224] border border-cyan-500/30 rounded-xl mb-3 space-y-1 text-xs font-mono">
            <span className="text-slate-400 text-[10px] tracking-widest uppercase">WINNER WALLET:</span>
            <p className="text-white font-bold truncate">
              {winner.address.slice(0, 10)}...{winner.address.slice(-8)}
              {isWinner && <span className="text-[#00ff88] ml-1 font-black">(YOU)</span>}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/10">
              <span>Winning Ticket:</span>
              <span className="font-bold text-[#00f0ff]">#{winner.winningTicket}</span>
            </div>
          </div>

          {/* Prize Breakdown (95% Winner, 5% Deflationary Burn) */}
          <div className="p-3.5 rounded-xl bg-[#091224] border border-emerald-500/40 mb-3 shadow-[0_0_15px_rgba(0,255,136,0.15)]">
            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-0.5 font-bold">NET PRIZE WON (95%)</p>
            <div className="text-3xl font-black text-[#00ff88] font-mono tracking-tight flex items-center justify-center gap-1">
              <span>{winner.prizePons.toLocaleString()}</span>
              <span className="text-sm text-cyan-400 font-bold">PONS</span>
            </div>
            <div className="flex items-center justify-around text-[10px] text-slate-400 font-mono pt-2 mt-2 border-t border-white/10">
              <span>Total Pool: {winner.totalPoolPons.toLocaleString()}</span>
              <span>•</span>
              <span className="text-[#ff007a]">🔥 Burn (5%): {winner.feePons.toLocaleString()}</span>
            </div>
          </div>

          {/* Winner Claim Section */}
          {isWinner ? (
            <div className="space-y-2 mb-3">
              {/* Claim Status Lifecycle Indicator */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#040813] border border-cyan-500/30 rounded-lg text-[9px] font-mono font-bold">
                <span className={claimStatus === 'unclaimed' ? 'text-amber-400' : 'text-slate-500'}>
                  UNCLAIMED
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span className={claimStatus === 'claiming' ? 'text-[#00f0ff] animate-pulse' : 'text-slate-500'}>
                  CLAIM TX
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span className={claimStatus === 'confirmed' ? 'text-[#00ff88] animate-pulse' : 'text-slate-500'}>
                  CONFIRMED
                </span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span className={claimStatus === 'paid' ? 'text-[#00ff88]' : 'text-slate-500'}>
                  PAID
                </span>
              </div>

              {claimStatus === 'paid' ? (
                <div className="p-3 bg-emerald-950/80 border border-[#00ff88]/50 rounded-xl text-[#00ff88] text-xs font-mono font-bold flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-[#00ff88]" />
                  <span>PRIZE TRANSFERRED ON-CHAIN</span>
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={claiming || claimStatus !== 'unclaimed'}
                  className="bg-gradient-to-r from-emerald-400 to-[#00ff88] text-black w-full py-3.5 font-black rounded-lg text-xs transition-all shadow-[0_0_20px_rgba(0,255,136,0.6)] flex items-center justify-center gap-2 font-orbitron tracking-wider active:scale-95 disabled:opacity-50"
                >
                  {claiming ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>SIGNING ON-CHAIN CLAIM...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>CLAIM WINNINGS [ SIGN TX ]</span>
                    </>
                  )}
                </button>
              )}

              {claimTx && (
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${claimTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#00f0ff] hover:underline font-mono"
                >
                  <span>View Claim Payout on Blockscout</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="p-2.5 bg-[#091224] rounded-lg border border-cyan-500/20 text-[10px] text-slate-300 font-mono mb-3">
              Prize claim can only be executed by the winner's wallet.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenVerify(game.gameId);
              }}
              className="flex-1 py-2.5 cyber-btn-glass rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>VERIFY PROOF</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#091224] hover:bg-[#0f1d38] text-slate-300 hover:text-white border border-white/10 rounded-lg text-xs font-mono font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

  );
};
