'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  Lock,
  Flame,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  if (!isOpen) return null;

  const canProceed = ageChecked && termsChecked;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg rounded-2xl bg-[#060b17]/98 backdrop-blur-2xl border-2 border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_50px_rgba(0,240,255,0.25)] space-y-5 text-white"
        >
          {/* Header */}
          <div className="flex items-start gap-3.5 pb-3 border-b border-cyan-500/20">
            <div className="w-11 h-11 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)] flex-shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider text-white font-orbitron text-neon-cyan">
                  PROTOCOL TERMS & CLEARANCE
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Verify compliance and authorize protocol access on Ponspot
              </p>
            </div>
          </div>

          {/* Quick Rules Overview */}
          <div className="p-4 rounded-xl bg-[#091224] border border-cyan-500/30 space-y-2.5 text-xs font-sans text-slate-300">
            <div className="flex items-center gap-2 text-xs font-bold text-white font-orbitron">
              <ShieldCheck className="w-4 h-4 text-[#00f0ff]" />
              <span>ON-CHAIN DECENTRALIZED PROTOCOL RULES</span>
            </div>
            <ul className="space-y-1.5 pl-2 text-[11px] leading-relaxed font-mono">
              <li className="flex items-start gap-1.5">
                <span className="text-[#00f0ff] font-bold">•</span>
                <span>
                  <strong className="text-white">Non-Custodial Escrow:</strong> All wagers are locked in smart contract escrow with autonomous winner payouts.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#00ff88] font-bold">•</span>
                <span>
                  <strong className="text-white">100% Provably Fair:</strong> Cryptographic ticket draws verifiable on-chain via SHA-256 pre-commit proofs.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#ff007a] font-bold">•</span>
                <span>
                  <strong className="text-white">5% Deflationary Burn:</strong> 5% of each round is automatically burned permanently to the Dead Address (<code className="text-[#ff007a]">0x000...dEaD</code>).
                </span>
              </li>
            </ul>
          </div>

          {/* Checkboxes Required */}
          <div className="space-y-3 pt-1">
            {/* Checkbox 1: Age verification */}
            <label
              onClick={() => setAgeChecked(!ageChecked)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                ageChecked
                  ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'bg-[#091224] border-cyan-500/20 hover:border-cyan-500/40 text-slate-400'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {ageChecked ? (
                  <CheckSquare className="w-5 h-5 text-[#00f0ff]" />
                ) : (
                  <Square className="w-5 h-5 opacity-40" />
                )}
              </div>
              <span className="text-xs leading-snug font-mono">
                I certify that I am <strong className="text-white">18 years of age or older</strong> and legally eligible to participate in Web3 decentralized gaming.
              </span>
            </label>

            {/* Checkbox 2: Terms & Privacy Agreement */}
            <div
              onClick={() => setTermsChecked(!termsChecked)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                termsChecked
                  ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'bg-[#091224] border-cyan-500/20 hover:border-cyan-500/40 text-slate-400'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {termsChecked ? (
                  <CheckSquare className="w-5 h-5 text-[#00f0ff]" />
                ) : (
                  <Square className="w-5 h-5 opacity-40" />
                )}
              </div>
              <span className="text-xs leading-snug font-mono">
                I have read, understood, and agree to Ponspot's{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-[#00f0ff] hover:underline inline-flex items-center gap-0.5"
                >
                  Terms of Use <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-[#00f0ff] hover:underline inline-flex items-center gap-0.5"
                >
                  Privacy Policy <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3 font-mono">
            <button
              onClick={onDecline}
              className="flex-1 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 transition-colors"
            >
              DECLINE
            </button>

            <button
              onClick={() => {
                if (canProceed) {
                  onAccept();
                }
              }}
              disabled={!canProceed}
              className={`flex-2 py-3 px-6 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all font-orbitron ${
                canProceed
                  ? 'cyber-btn-cyan shadow-[0_0_20px_rgba(0,240,255,0.5)] active:scale-95'
                  : 'bg-black/40 text-slate-600 border border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>ENTER THE ARENA</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
