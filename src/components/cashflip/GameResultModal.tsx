'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ShieldCheck, Check, ExternalLink, RefreshCw, ArrowRight } from 'lucide-react';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { BookplateCorner } from '@/components/ui/CelestialFlourish';

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
  const { account, claimWinnings } = useCashFlipWeb3();
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'unclaimed' | 'claiming' | 'confirmed' | 'paid'>('unclaimed');
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const winner = game?.winner;
  const isWinner = account && winner && account.toLowerCase() === winner.address.toLowerCase();

  useEffect(() => {
    if (isOpen && winner) {
      if (isWinner) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.4 },
          colors: ['#9E8055', '#C2A578', '#171513', '#E8DFD1'],
        });
      }
      setClaimStatus(winner.claimed ? 'paid' : 'unclaimed');
      setClaimTx(winner.claimTxHash || null);
      setClaimError(null);
    }
  }, [isOpen, winner, isWinner]);

  if (!isOpen || !game || !winner || !isWinner) return null;

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
      setClaimError(e?.reason || e?.message || 'Failed to execute claim on blockchain.');
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121110]/80 backdrop-blur-sm select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="bg-[#F4EFE6] dark:bg-[#1A1816] border border-[#171513] dark:border-[#E8DFD1]/30 p-6 shadow-2xl max-w-sm w-full text-center relative overflow-hidden text-[#171513] dark:text-[#E8DFD1] font-serif"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bookplate Corners */}
          <BookplateCorner position="tl" />
          <BookplateCorner position="tr" />
          <BookplateCorner position="bl" />
          <BookplateCorner position="br" />

          {/* Celestial Emblem Crown */}
          <div className="w-14 h-14 border border-brass flex items-center justify-center mx-auto mb-3 bg-brass/10 p-1">
            <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
          </div>

          <div className="text-[10px] font-mono tracking-[0.25em] text-brass uppercase mb-1">
            ORBIT RECORD • {game.gameId}
          </div>

          <h2 className="text-lg font-display font-bold tracking-wider uppercase mb-1">
            CELESTIAL VICTORY
          </h2>
          <p className="text-xs text-[#625B51] dark:text-[#9E968B] italic mb-3">
            The astronomical draw has concluded in your favor.
          </p>

          {/* Champion Seal Strip */}
          <div className="p-3 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/50 dark:bg-black/20 mb-3 space-y-1 text-xs font-mono">
            <span className="text-[10px] text-[#625B51] dark:text-[#9E968B] uppercase">Champion Repository:</span>
            <p className="font-bold text-brass truncate">
              {winner.address.slice(0, 10)}...{winner.address.slice(-8)} (You)
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#625B51] dark:text-[#9E968B] pt-1 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10">
              <span>Winning Ticket:</span>
              <span className="font-bold text-brass">#{winner.winningTicket}</span>
            </div>
          </div>

          {/* Net Prize Callout */}
          <div className="p-3.5 border border-brass/40 bg-brass/5 mb-3">
            <p className="text-[9px] font-mono uppercase tracking-widest text-[#625B51] dark:text-[#9E968B] mb-0.5">
              NET PRIZE ALLOTMENT (98%)
            </p>
            <div className="text-3xl font-display font-bold tracking-tight text-[#171513] dark:text-brass flex items-center justify-center gap-1.5">
              <span>{((winner as any).prize ?? winner.prizePons ?? 0).toLocaleString()}</span>
              <span className="text-xs font-serif italic text-brass">USDG</span>
            </div>
            <div className="flex items-center justify-around text-[9px] text-[#625B51] dark:text-[#9E968B] font-mono pt-2 mt-2 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10">
              <span>Total Pot: {((winner as any).totalPool ?? winner.totalPoolPons ?? 0).toLocaleString()}</span>
              <span>•</span>
              <span>Admin Fee (2%): {((winner as any).fee ?? winner.feePons ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Claim Execution */}
          <div className="space-y-2 mb-3">
            {/* Status Steps */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border border-[#171513]/15 dark:border-[#E8DFD1]/15 bg-white/40 dark:bg-black/20 text-[9px] font-mono">
              <span className={claimStatus === 'unclaimed' ? 'text-brass font-bold' : 'opacity-40'}>
                UNCLAIMED
              </span>
              <ArrowRight className="w-2.5 h-2.5 opacity-40" />
              <span className={claimStatus === 'claiming' ? 'text-brass font-bold animate-pulse' : 'opacity-40'}>
                SIGNING
              </span>
              <ArrowRight className="w-2.5 h-2.5 opacity-40" />
              <span className={claimStatus === 'confirmed' ? 'text-brass font-bold animate-pulse' : 'opacity-40'}>
                CONFIRMED
              </span>
              <ArrowRight className="w-2.5 h-2.5 opacity-40" />
              <span className={claimStatus === 'paid' ? 'text-brass font-bold' : 'opacity-40'}>
                DISBURSED
              </span>
            </div>

            {claimStatus === 'paid' ? (
              <div className="p-2.5 border border-brass text-brass text-xs font-mono font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>ALLOTMENT DISBURSED ON-CHAIN</span>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming || claimStatus !== 'unclaimed'}
                className="editorial-btn-primary w-full py-3 text-xs tracking-widest disabled:opacity-40"
              >
                {claiming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>INSCRIBING CLAIM ON-CHAIN...</span>
                  </>
                ) : (
                  <span>CLAIM PRIZE ALLOTMENT</span>
                )}
              </button>
            )}

            {claimError && (
              <div className="p-2 border border-red-800/40 bg-red-950/20 text-red-500 text-[11px] font-mono leading-tight">
                {claimError}
              </div>
            )}

            {claimTx && (
              <a
                href={`${ROBINHOOD_CHAIN_CONFIG.blockExplorer}/tx/${claimTx}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-brass hover:underline font-mono"
              >
                <span>Examine Transaction On Blockscout</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenVerify(game.gameId);
              }}
              className="editorial-btn-secondary flex-1 py-2 text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VERIFY</span>
            </button>
            <button
              onClick={onClose}
              className="editorial-btn-secondary flex-1 py-2 text-[11px]"
            >
              CLOSE
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
