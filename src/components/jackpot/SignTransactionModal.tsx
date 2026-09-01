'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Zap, Check, X, ExternalLink, ArrowRight, RefreshCw, Lock, Sparkles, Coins } from 'lucide-react';
import { AppUser } from '@/context/WalletContext';

export interface BetSignDetails {
  type: 'bet';
  betQty: number;
  costPts: number;
  ethAmount: number;
  currentTickets: number;
  totalPotTickets: number;
  currentPotTotal: number;
}

export interface ClaimSignDetails {
  type: 'claim';
  roundNumber: number;
  potWonPts: number;
  ethAmount: number;
  winnerAddress: string;
}

export type SignTxDetails = BetSignDetails | ClaimSignDetails;

interface SignTransactionModalProps {
  isOpen: boolean;
  details: SignTxDetails | null;
  user: AppUser | null;
  onConfirm: () => Promise<string | null>; // returns txHash or null if failed
  onClose: () => void;
}

import { getGameContractAddress } from '@/lib/web3/contracts';

export const SignTransactionModal: React.FC<SignTransactionModalProps> = ({
  isOpen,
  details,
  user,
  onConfirm,
  onClose,
}) => {
  const [status, setStatus] = useState<'idle' | 'signing' | 'confirming' | 'confirmed' | 'rejected'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !details) return null;

  const isBet = details.type === 'bet';

  // Calculate chance accumulation for Bet
  let newChance = '0.00';
  if (isBet) {
    const betD = details as BetSignDetails;
    const newTotalPlayerTickets = betD.currentTickets + betD.betQty;
    const newTotalPotTickets = betD.totalPotTickets + betD.betQty;
    newChance = newTotalPotTickets > 0 ? ((newTotalPlayerTickets / newTotalPotTickets) * 100).toFixed(2) : '100.00';
  }

  const handleSign = async () => {
    setStatus('signing');
    setErrorMsg(null);

    try {
      // Simulate/Trigger wallet signature
      const hash = await onConfirm();
      if (hash) {
        setTxHash(hash);
        setStatus('confirmed');
      } else {
        setStatus('rejected');
        setErrorMsg('Transaction signature was rejected by user.');
      }
    } catch (err: any) {
      setStatus('rejected');
      setErrorMsg(err?.message || 'Failed to sign transaction.');
    }
  };

  const handleDone = () => {
    setStatus('idle');
    setTxHash(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={(e) => {
          if (status !== 'signing' && status !== 'confirming') handleDone();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="bg-gradient-to-b from-[#0a1428]/95 to-[#040812]/95 border-2 border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.25)] max-w-md w-full relative overflow-hidden backdrop-blur-2xl text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient neon cyan light bar */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-cyan-500/15 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                  {isBet ? 'SIGN BET TRANSACTION' : 'CLAIM POT SIGNATURE'}
                  <span className="px-1.5 py-0.2 bg-cyan-950/80 border border-cyan-400/40 text-[#00f0ff] text-[9px] font-mono font-bold rounded">
                    EIP-1193
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Robinhood Chain (Chain ID: 4663)</p>
              </div>
            </div>

            {status !== 'signing' && status !== 'confirming' && (
              <button
                onClick={handleDone}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body Content based on Status */}
          {status === 'confirmed' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-black text-white">
                  {isBet ? 'Bet Transaction Successfully Signed!' : 'Jackpot Prize Successfully Claimed!'}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {isBet
                    ? `${(details as BetSignDetails).betQty} tickets entered into the pot. Your winning odds are accumulated!`
                    : `Prize of ${(details as ClaimSignDetails).ethAmount.toFixed(3)} ETH successfully transferred to wallet.`}
                </p>
              </div>

              {txHash && (
                <div className="p-3 bg-[#050914] border border-cyan-500/20 rounded-2xl text-left space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Robinhood Chain Tx Hash
                  </span>
                  <p className="text-xs font-mono text-cyan-300 break-all">{txHash}</p>
                  <a
                    href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00f0ff] hover:underline pt-1"
                  >
                    <span>View on Blockscout Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <button
                onClick={handleDone}
                className="tactile-btn w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-black rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                Done
              </button>
            </div>
          ) : status === 'rejected' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                <X className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Signature Cancelled</h4>
                <p className="text-xs text-rose-300/80 font-mono mt-1">{errorMsg}</p>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="tactile-btn w-full py-2.5 bg-[#0e172a] text-slate-200 hover:bg-[#132039] border border-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Try Again
              </button>
            </div>
          ) : status === 'signing' || status === 'confirming' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 text-[#00f0ff] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-black text-white animate-pulse">Waiting for Wallet Confirmation...</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Please review and confirm the signature prompt in your <b>OKX / MetaMask Wallet</b> on Robinhood Chain.
                </p>
              </div>
              <div className="p-3 bg-[#050a16] rounded-xl border border-cyan-500/15 text-[11px] text-slate-400 font-mono">
                Gas Limit: 21000 • Gas Price: 0.1 Gwei (Nitro L2)
              </div>
            </div>
          ) : (
            /* IDLE REVIEW DETAILS */
            <div className="space-y-3.5">
              {/* Transaction Summary Card */}
              <div className="p-3.5 rounded-2xl bg-[#060c1a] border border-cyan-500/25 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Action Type:</span>
                  <span className="font-mono font-bold text-[#00f0ff]">
                    {isBet ? 'Deposit to Pot Vault' : 'Claim Vault Payout'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Vault Contract:</span>
                  <span className="font-mono text-slate-300 text-[10px]">
                    {getGameContractAddress() ? `${getGameContractAddress().slice(0, 10)}...${getGameContractAddress().slice(-8)}` : 'On-Chain Vault'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">Wager / Claim Amount:</span>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400 flex items-center gap-1 justify-end">
                      <span>Ξ</span>
                      <span>{details.ethAmount.toFixed(3)} ETH</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({isBet ? (details as BetSignDetails).costPts : (details as ClaimSignDetails).potWonPts} pts)
                    </span>
                  </div>
                </div>

                {isBet && (
                  <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Accumulated Odds (Chance):</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-500 text-[11px]">
                        {((details as BetSignDetails).currentTickets > 0 ? (details as BetSignDetails).currentTickets : 0)} tkts
                      </span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <span className="text-emerald-400 font-black">
                        +{ (details as BetSignDetails).betQty } tkts ({ newChance }%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet & Gas Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-xl bg-[#060b16] border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Signer Wallet</span>
                  <span className="text-white font-bold truncate block">
                    {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Demo Wallet'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#060b16] border border-slate-800">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Est. L2 Gas</span>
                  <span className="text-cyan-400 font-bold block">~0.00012 ETH (Nitro)</span>
                </div>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/15 text-[10px] text-cyan-300/80 font-mono">
                <ShieldCheck className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
                <span>
                  This transaction is encrypted and settled on-chain on Robinhood Chain (Arbitrum L2). Your funds are provably fair.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleDone}
                  className="flex-1 py-3 bg-[#0d1424] hover:bg-[#121c33] text-slate-300 font-bold rounded-xl text-xs transition-colors border border-cyan-500/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSign}
                  className="tactile-btn flex-2 py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-black rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>SIGN & CONFIRM ON-CHAIN</span>

                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
