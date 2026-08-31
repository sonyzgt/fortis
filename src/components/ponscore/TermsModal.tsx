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
          className="relative w-full max-w-lg rounded-3xl bg-white/90 dark:bg-[#0c1611]/95 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/40 p-6 sm:p-7 shadow-2xl space-y-5 text-[#243329] dark:text-[#F5F8F3]"
        >
          {/* Header */}
          <div className="flex items-start gap-3.5 pb-3 border-b border-black/5 dark:border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-[#718D76]/20 dark:bg-emerald-500/20 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm flex-shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[#243329] dark:text-white">
                  PERATURAN & KETENTUAN LAYANAN
                </h2>
              </div>
              <p className="text-xs text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Konfirmasi persetujuan sebelum memulai permainan di Ponspot
              </p>
            </div>
          </div>

          {/* Quick Rules Overview */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 space-y-2.5 text-xs font-sans text-[#3a4d3f] dark:text-slate-300">
            <div className="flex items-center gap-2 text-xs font-bold text-[#243329] dark:text-white font-mono">
              <ShieldCheck className="w-4 h-4 text-[#718D76] dark:text-emerald-400" />
              <span>Prinsip Game Terdesentralisasi Web3:</span>
            </div>
            <ul className="space-y-1.5 pl-2 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="text-[#718D76] dark:text-emerald-400 font-bold">•</span>
                <span>
                  <strong>Non-Custodial Escrow:</strong> Taruhan dikelola langsung oleh Smart Contract di Robinhood Chain, hadiah dicairkan otonom ke wallet pemenang.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#718D76] dark:text-emerald-400 font-bold">•</span>
                <span>
                  <strong>100% Provably Fair:</strong> Hasil tiket acak dijamin transparan dan dapat diverifikasi secara independen dengan kriptografi SHA-256.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>
                  <strong>5% Deflationary Burn:</strong> Biaya 5% dari setiap pot round otomatis dibakar permanen ke Dead Address (<code className="font-mono text-[10px]">0x0000...dEaD</code>).
                </span>
              </li>
            </ul>
          </div>

          {/* Checkboxes Required */}
          <div className="space-y-3 pt-1">
            {/* Checkbox 1: Age verification */}
            <label
              onClick={() => setAgeChecked(!ageChecked)}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                ageChecked
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-[#243329] dark:text-white shadow-sm'
                  : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-[#526256] dark:text-slate-300'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {ageChecked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-5 h-5 opacity-40" />
                )}
              </div>
              <span className="text-xs leading-snug">
                Saya menyatakan bahwa saya telah berusia <strong>18 tahun ke atas</strong> (atau usia legal mayoritas) dan berhak secara hukum untuk berpartisipasi dalam permainan on-chain ini.
              </span>
            </label>

            {/* Checkbox 2: Terms & Privacy Agreement */}
            <label
              onClick={() => setTermsChecked(!termsChecked)}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                termsChecked
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-[#243329] dark:text-white shadow-sm'
                  : 'bg-white/50 dark:bg-white/5 border-white/80 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-[#526256] dark:text-slate-300'
              }`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {termsChecked ? (
                  <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-5 h-5 opacity-40" />
                )}
              </div>
              <span className="text-xs leading-snug" onClick={(e) => e.stopPropagation()}>
                Saya telah membaca, memahami, dan menyetujui{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-bold text-[#718D76] dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Terms of Use <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>{' '}
                dan{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-bold text-[#718D76] dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Privacy Policy <ExternalLink className="w-2.5 h-2.5 inline" />
                </Link>{' '}
                Ponspot.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-mono font-bold text-[#526256] dark:text-slate-400 transition-colors"
            >
              Batal
            </button>

            <button
              onClick={() => {
                if (canProceed) {
                  onAccept();
                }
              }}
              disabled={!canProceed}
              className={`flex-2 py-3 px-6 rounded-2xl font-mono font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                canProceed
                  ? 'btn-primary-sage opacity-100 scale-100'
                  : 'bg-black/10 dark:bg-white/10 text-black/40 dark:text-white/30 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>SETUJU & MASUK KE GAME</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
