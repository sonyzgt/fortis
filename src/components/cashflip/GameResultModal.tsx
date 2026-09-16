'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ShieldCheck, Check, ExternalLink, RefreshCw, ArrowRight, X, Trophy } from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ROBINHOOD_CHAIN_CONFIG, isGameClaimedOnChain, TOKEN_SYMBOL } from '@/lib/web3/contracts';

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
  const [mounted, setMounted] = useState(false);
  const { account, claimWinnings } = useCashFlipWeb3();
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'unclaimed' | 'claiming' | 'confirmed' | 'paid'>('unclaimed');
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const winner = game?.winner;
  const isWinner = account && winner && account.toLowerCase() === winner.address.toLowerCase();

  useEffect(() => {
    let active = true;
    if (isOpen && winner) {
      if (isWinner) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.4 },
          colors: ['#00E701', '#213743', '#3B82F6', '#F5F7FA'],
        });
      }
      setClaimStatus(winner.claimed ? 'paid' : 'unclaimed');
      setClaimTx(winner.claimTxHash || null);
      setClaimError(null);

      // Verify claim status directly with the on-chain smart contract
      if (game?.gameId) {
        isGameClaimedOnChain(game.gameId).then((claimedOnChain) => {
          if (active && claimedOnChain) {
            setClaimStatus('paid');
            if (onClaimSuccess) {
              onClaimSuccess(game.gameId, winner.claimTxHash || 'on-chain');
            }
          }
        });
      }
    }
    return () => {
      active = false;
    };
  }, [isOpen, winner, isWinner, game?.gameId]);

  if (!isOpen || !game || !winner || !isWinner || !mounted || typeof document === 'undefined') return null;

  const handleClaim = async () => {
    if (!isWinner || claiming) return;
    setClaiming(true);
    setClaimStatus('claiming');
    setClaimError(null);

    const poolAmount =
      (winner as any)?.totalPool ??
      winner?.totalPoolPons ??
      game?.totalPool ??
      ((winner as any)?.prize ? Number(((winner as any).prize / 0.98).toFixed(2)) : (winner?.prizePons ? Number((winner.prizePons / 0.98).toFixed(2)) : 0));

    try {
      const hash = await claimWinnings(
        game.gameId,
        poolAmount,
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
    } catch (e: any) {
      console.error('Claim error:', e);
      const msg = e?.reason || e?.message || '';
      if (msg.toLowerCase().includes('already claimed')) {
        // Contract confirmed it was already successfully claimed
        setClaimStatus('paid');
        setClaimError(null);
        if (onClaimSuccess) {
          onClaimSuccess(game.gameId, 'on-chain');
        }
      } else {
        setClaimError(msg || 'Failed to execute claim on blockchain.');
        setClaimStatus('unclaimed');
      }
    } finally {
      setClaiming(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#030508]/85 backdrop-blur-xl select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-capsule rounded-3xl p-6 sm:p-7 max-w-md w-full relative overflow-hidden text-[#F5F7FA] font-sans shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.15)] border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Strip */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00E701]/10 border border-[#00E701]/25 flex items-center justify-center text-[#00E701] shadow-inner flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00E701] font-bold">
                  ROUND CONCLUDED
                </div>
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-[#F5F7FA]">
                  VICTORY SETTLEMENT
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Game ID Badge */}
          <div className="flex items-center justify-between px-3.5 py-2 glass-capsule rounded-xl font-mono text-[11px] mb-4">
            <span className="text-[#8993A4] uppercase tracking-wider">GAME RECORD:</span>
            <span className="text-[#F5F7FA] font-bold">{game.gameId}</span>
          </div>

          {/* Winner Credentials Node */}
          <div className="p-4 glass-capsule rounded-2xl mb-4 space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] text-[#8993A4] uppercase tracking-wider">ALLOTTEE ACCOUNT:</span>
              <span className="text-[10px] text-[#00E701] font-bold">VERIFIED RECIPIENT</span>
            </div>
            <p className="font-bold text-[#F5F7FA] truncate font-mono text-xs">
              {winner.address}
            </p>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/[0.06] font-mono">
              <span className="text-[#8993A4]">Drawn Ticket Index:</span>
              <span className="font-bold text-[#00E701]">#{winner.winningTicket}</span>
            </div>
          </div>

          {/* Net Prize Vault Callout */}
          <div className="p-5 glass-capsule rounded-2xl mb-4 text-center relative overflow-hidden border border-[#00E701]/30 bg-[#00E701]/[0.04] shadow-[0_0_25px_rgba(205, 180, 134,0.08)]">
            <div className="absolute top-0 right-0 glass-pill-active font-mono text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl">
              98% DISBURSEMENT
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8993A4] mb-1">
              NET ALLOTMENT YIELD
            </div>
            <div className="text-4xl font-heading font-bold tracking-tight text-[#00E701] flex items-center justify-center gap-2 drop-shadow-[0_0_15px_rgba(205, 180, 134,0.35)]">
              <span>{((winner as any).prize ?? winner.prizePons ?? 0).toLocaleString()}</span>
              <span className="text-sm font-mono font-bold text-[#F5F7FA]/70">{TOKEN_SYMBOL}</span>
            </div>
            <div className="flex items-center justify-around text-[11px] text-[#8993A4] font-mono pt-3 mt-3 border-t border-white/[0.06]">
              <span>Gross: {((winner as any).totalPool ?? winner.totalPoolPons ?? 0).toLocaleString()} {TOKEN_SYMBOL}</span>
              <span>•</span>
              <span className="text-amber-400/90">Burned (2%): {((winner as any).fee ?? winner.feePons ?? 0).toLocaleString()} {TOKEN_SYMBOL}</span>
            </div>
          </div>

          {/* Execution Pipeline */}
          <div className="space-y-3 mb-5">
            {/* Status Steps */}
            <div className="flex items-center justify-between px-3.5 py-2 glass-capsule rounded-xl text-[10px] font-mono">
              <span className={claimStatus === 'unclaimed' ? 'text-[#00E701] font-bold' : 'text-[#8993A4]'}>
                01 UNCLAIMED
              </span>
              <ArrowRight className="w-3 h-3 text-[#8993A4]" />
              <span className={claimStatus === 'claiming' ? 'text-[#00E701] font-bold animate-pulse' : 'text-[#8993A4]'}>
                02 SIGNING
              </span>
              <ArrowRight className="w-3 h-3 text-[#8993A4]" />
              <span className={claimStatus === 'confirmed' ? 'text-[#00E701] font-bold animate-pulse' : 'text-[#8993A4]'}>
                03 CONFIRMED
              </span>
              <ArrowRight className="w-3 h-3 text-[#8993A4]" />
              <span className={claimStatus === 'paid' ? 'text-[#00E701] font-bold' : 'text-[#8993A4]'}>
                04 DISBURSED
              </span>
            </div>

            {claimStatus === 'paid' ? (
              <div className="p-3.5 glass-capsule rounded-2xl border border-[#00E701]/40 text-[#00E701] text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(205, 180, 134,0.15)]">
                <Check className="w-4 h-4" />
                <span className="tracking-wider uppercase">FUNDS DISBURSED ON-CHAIN</span>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming || claimStatus !== 'unclaimed'}
                className="w-full py-3.5 glass-btn-inflated text-xs font-bold tracking-[0.15em] uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                {claiming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#030508]" />
                    <span>EXECUTING ON ROBINHOOD CHAIN...</span>
                  </>
                ) : (
                  <span>DISBURSE PRIZE TO WALLET ↗</span>
                )}
              </button>
            )}

            {claimError && (
              <div className="p-3.5 border border-rose-500/40 bg-rose-950/20 rounded-2xl text-rose-300 text-[11px] font-mono leading-tight">
                {claimError}
              </div>
            )}

            {claimTx && (
              <div className="text-center pt-1">
                <a
                  href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${claimTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#00E701] hover:underline font-mono"
                >
                  <span>Inspect Transaction on Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => {
                onClose();
                onOpenVerify(game.gameId);
              }}
              className="flex-1 py-2.5 glass-btn-chip rounded-xl text-[#00E701] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#00E701]" />
              <span>VERIFY AUDIT</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 glass-btn-chip rounded-xl text-[#8993A4] hover:text-[#F5F7FA] text-xs uppercase tracking-wider cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
