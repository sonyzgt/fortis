'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  CheckSquare,
  Square,
  ExternalLink,
  Feather,
} from 'lucide-react';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

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
          className="absolute inset-0 bg-[#0a0908]/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="editorial-frame relative w-full max-w-lg bg-[#E8DFD1] text-[#171513] p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.55)] space-y-4 select-none"
        >
          <BookplateCorner />

          {/* Header */}
          <div className="flex items-start gap-3.5 pb-3 border-b border-[#171513]/15">
            <div className="w-10 h-10 border border-[#9E8055]/50 bg-[#F4EFE6] flex items-center justify-center text-[#9E8055] flex-shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-[#9E8055] block">
                Covenant & Protocol
              </span>
              <h2 className="text-base font-serif tracking-[0.1em] font-semibold text-[#171513]">
                CANON OF CONDUCT & COVENANT
              </h2>
              <p className="text-[11px] text-[#171513]/60 font-serif italic mt-0.5">
                Inscribe your covenant prior to entering CashFlip duels and the celestial wheel
              </p>
            </div>
          </div>

          {/* Quick Rules Overview */}
          <div className="p-4 bg-[#F4EFE6] border border-[#171513]/15 space-y-2.5 text-xs text-[#171513]">
            <div className="flex items-center gap-2 text-xs font-serif font-semibold tracking-wider text-[#171513]">
              <ShieldCheck className="w-4 h-4 text-[#9E8055]" />
              <span className="uppercase text-[11px]">IMMUTABLE ON-CHAIN PRINCIPLES</span>
            </div>
            <ul className="space-y-1.5 pl-1 text-[11px] leading-relaxed font-serif text-[#171513]/80">
              <li className="flex items-start gap-2">
                <span className="text-[#9E8055] font-serif">✦</span>
                <span>
                  <strong className="text-[#171513]">Autonomous Vault Escrow:</strong> All wagers are immutably held by the audited smart contract vault upon Robinhood Chain, with trustless victor dispensations for Coinflip and Jackpot.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9E8055] font-serif">✦</span>
                <span>
                  <strong className="text-[#171513]">Provably Fair Entropy:</strong> Coinflip duel results and winning tickets are mathematically determined through SHA-256 cryptographic commitments verified transparently on-chain.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#9E8055] font-serif">✦</span>
                <span>
                  <strong className="text-[#171513]">Transparent Protocol Tithe:</strong> Nominal protocol fees are retained within the smart contract protocol for sanctuary maintenance and decentralized liquidity.
                </span>
              </li>
            </ul>
          </div>

          {/* Checkboxes Required */}
          <div className="space-y-2.5 pt-1">
            {/* Checkbox 1: Age verification */}
            <div
              onClick={() => setAgeChecked(!ageChecked)}
              className={`flex items-start gap-3 p-3 border cursor-pointer select-none transition-colors ${
                ageChecked
                  ? 'bg-[#F4EFE6] border-[#9E8055] text-[#171513]'
                  : 'bg-[#E8DFD1] border-[#171513]/20 hover:border-[#171513]/40 text-[#171513]/70'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {ageChecked ? (
                  <CheckSquare className="w-4 h-4 text-[#9E8055]" />
                ) : (
                  <Square className="w-4 h-4 opacity-40 text-[#171513]" />
                )}
              </div>
              <span className="text-xs font-serif leading-snug">
                I solemnize that I am <strong className="text-[#171513]">18 years of age or older</strong> (or the legal age of majority in my jurisdiction) and legally authorized to engage in decentralized cryptographic games.
              </span>
            </div>

            {/* Checkbox 2: Terms & Privacy Agreement */}
            <div
              onClick={() => setTermsChecked(!termsChecked)}
              className={`flex items-start gap-3 p-3 border cursor-pointer select-none transition-colors ${
                termsChecked
                  ? 'bg-[#F4EFE6] border-[#9E8055] text-[#171513]'
                  : 'bg-[#E8DFD1] border-[#171513]/20 hover:border-[#171513]/40 text-[#171513]/70'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {termsChecked ? (
                  <CheckSquare className="w-4 h-4 text-[#9E8055]" />
                ) : (
                  <Square className="w-4 h-4 opacity-40 text-[#171513]" />
                )}
              </div>
              <span className="text-xs font-serif leading-snug">
                I have reviewed and assent to the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-[#9E8055] underline hover:text-[#171513] inline-flex items-center gap-0.5"
                >
                  Canon of Terms <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-[#9E8055] underline hover:text-[#171513] inline-flex items-center gap-0.5"
                >
                  Privacy Covenant <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-2.5 border border-[#171513]/20 hover:bg-[#171513]/5 text-xs font-serif tracking-wider uppercase text-[#171513]/70 transition-colors"
            >
              Withdraw
            </button>

            <button
              onClick={() => {
                if (canProceed) {
                  onAccept();
                }
              }}
              disabled={!canProceed}
              className={`flex-1 py-2.5 px-4 font-serif tracking-widest text-xs uppercase flex items-center justify-center gap-2 transition-all border ${
                canProceed
                  ? 'bg-[#171513] text-[#F4EFE6] border-[#9E8055]/50 hover:bg-[#25221e] cursor-pointer shadow-md'
                  : 'bg-[#171513]/15 text-[#171513]/40 border-transparent cursor-not-allowed'
              }`}
            >
              <Feather className="w-3.5 h-3.5 text-[#9E8055]" />
              <span>Affirm & Inscribe</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
