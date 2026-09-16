'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckSquare, Square, ExternalLink, X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAgeChecked(false);
      setTermsChecked(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const canProceed = ageChecked && termsChecked;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#030508]/85 backdrop-blur-xl"
        />

        {/* Liquid Glass Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg glass-capsule rounded-3xl text-[#F5F7FA] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.1)] space-y-4 select-none font-sans border border-white/10"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/[0.06]">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#00E701] block font-bold">
                TERMS & CONDITIONS
              </span>
              <h2 className="font-heading text-lg font-bold text-[#F5F7FA] tracking-wide uppercase">
                TERMS OF PARTICIPATION
              </h2>
              <p className="text-xs text-[#8993A4] mt-0.5">
                Confirm your assent prior to executing decentralized smart contract interactions.
              </p>
            </div>
            <button
              onClick={onDecline}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Protocol Principles */}
          <div className="p-4 glass-capsule rounded-2xl space-y-3 text-xs text-[#8993A4]">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#00E701] uppercase">
              <ShieldCheck className="w-4 h-4 text-[#00E701]" />
              <span className="text-[10px] font-mono tracking-widest">DECENTRALIZED EXECUTION CHARTER</span>
            </div>
            <ul className="space-y-2.5 text-[11px] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="text-[#00E701] font-mono font-bold">01</span>
                <span>
                  <strong className="text-[#F5F7FA]">Non-Custodial Settlement:</strong> Capital is deposited directly into smart contract vaults on Robinhood Chain with automated settlement.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#00E701] font-mono font-bold">02</span>
                <span>
                  <strong className="text-[#F5F7FA]">Cryptographic Determinism:</strong> Outcomes are dictated by HMAC-SHA256 seeds and mathematical modulo.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#00E701] font-mono font-bold">03</span>
                <span>
                  <strong className="text-[#F5F7FA]">Platform Fee:</strong> A standard 2.0% platform fee is retained by the smart contract vault upon payout execution.
                </span>
              </li>
            </ul>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2.5 pt-1">
            {/* Checkbox 1: Age verification */}
            <div
              onClick={() => setAgeChecked(!ageChecked)}
              className={`flex items-start gap-3 p-3.5 glass-capsule rounded-2xl cursor-pointer select-none transition-all ${
                ageChecked
                  ? 'border-[#00E701]/40 bg-[#00E701]/[0.05] shadow-[0_0_15px_rgba(205, 180, 134,0.1)]'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {ageChecked ? (
                  <CheckSquare className="w-4 h-4 text-[#00E701]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8993A4]/60" />
                )}
              </div>
              <span className="text-xs text-[#8993A4] leading-relaxed">
                I certify that I am <strong className="text-[#F5F7FA]">18 years of age or older</strong> (or the age of legal majority in my jurisdiction) and authorized to interact with decentralized smart contracts.
              </span>
            </div>

            {/* Checkbox 2: Terms & Privacy Agreement */}
            <div
              onClick={() => setTermsChecked(!termsChecked)}
              className={`flex items-start gap-3 p-3.5 glass-capsule rounded-2xl cursor-pointer select-none transition-all ${
                termsChecked
                  ? 'border-[#00E701]/40 bg-[#00E701]/[0.05] shadow-[0_0_15px_rgba(205, 180, 134,0.1)]'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {termsChecked ? (
                  <CheckSquare className="w-4 h-4 text-[#00E701]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8993A4]/60" />
                )}
              </div>
              <span className="text-xs text-[#8993A4] leading-relaxed">
                I have reviewed and assent to the{' '}
                <Link
                  href="/docs?tab=terms"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-[#00E701] hover:underline inline-flex items-center gap-0.5"
                >
                  Terms of Service <ExternalLink className="w-3 h-3 inline" />
                </Link>{' '}
                and{' '}
                <Link
                  href="/docs?tab=privacy"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-[#00E701] hover:underline inline-flex items-center gap-0.5"
                >
                  Privacy Policy <ExternalLink className="w-3 h-3 inline" />
                </Link>.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3 font-mono">
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 glass-btn-chip text-xs uppercase tracking-wider text-[#8993A4] hover:text-[#F5F7FA] transition-colors cursor-pointer"
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
              className={`flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                canProceed
                  ? 'glass-btn-inflated'
                  : 'glass-capsule opacity-40 cursor-not-allowed text-[#8993A4]'
              }`}
            >
              <span>ACCEPT & ENTER ↗</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
