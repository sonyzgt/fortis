'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  EyeOff,
  Database,
  Key,
  Cookie,
  Mail,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ponspot_theme');
    if (saved === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('ponspot_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('ponspot_theme', 'light');
      }
      return next;
    });
  };

  return (
    <div className={`min-h-screen overflow-y-auto cyber-grid-bg font-sans transition-colors duration-300 ${isDarkMode ? 'dark text-[#F5F8F3]' : 'text-[#243329]'}`}>
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 h-20 border-b border-white/60 dark:border-[#718D76]/30 bg-[#A4BAA2]/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl px-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/60 hover:bg-white/90 dark:bg-[#14241d]/70 dark:hover:bg-[#1c3328] border border-white/80 dark:border-[#718D76]/35 rounded-xl text-xs font-mono font-bold transition-all shadow-sm text-[#243329] dark:text-emerald-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Game</span>
          </Link>
          <div className="h-5 w-[1px] bg-black/10 dark:bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-wider text-[#243329] dark:text-white font-mono">PONSPOT</span>
            <span className="px-2 py-0.5 rounded-md bg-[#718D76]/20 dark:bg-emerald-500/20 text-[#718D76] dark:text-emerald-300 text-[10px] font-mono font-bold">
              PRIVACY POLICY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 border border-white/80 text-[#526256] hover:text-[#243329] dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-amber-400 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#718D76]" />}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Banner Hero */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0c1611]/90 backdrop-blur-2xl border border-white/90 dark:border-[#718D76]/35 shadow-xl space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#718D76]/20 dark:bg-emerald-500/20 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm flex-shrink-0">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#243329] dark:text-white tracking-tight">
                Privacy Policy & Data Transparency
              </h1>
              <p className="text-xs text-[#526256] dark:text-[#8fa596] font-mono mt-0.5">
                Full Decentralization Principle • No KYC • Zero Personal Data Tracking
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#3a4d3f] dark:text-slate-300 leading-relaxed pt-2">
            At <strong className="text-[#243329] dark:text-white font-bold">Ponspot</strong>, we strictly adhere to the Web3 decentralized philosophy: user privacy and data sovereignty are absolute rights. This platform is designed to operate without requiring email registration, government-issued IDs, or financial banking data.
          </p>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed font-sans text-[#3a4d3f] dark:text-slate-300">
          {/* 1. Zero Personal Data */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <ShieldCheck className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">1. Personal Data We DO NOT Collect</h2>
            </div>
            <p>
              Ponspot <strong>never asks for or collects</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Full legal names, dates of birth, or residential addresses.</li>
              <li>Phone numbers, mandatory email addresses, or government identification documents (Passport, Driver License, National ID).</li>
              <li>Bank account numbers, credit cards, or fiat financial information.</li>
              <li><strong>Private Keys or Seed Phrases:</strong> Your wallet private key never touches our server and remains securely stored inside your Web3 wallet extension.</li>
            </ul>
          </section>

          {/* 2. Blockchain Public Data */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Database className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">2. Robinhood Chain Public Blockchain Data</h2>
            </div>
            <p>
              When you perform on-chain interactions (such as token approvals, jackpot bets, or prize claims), your transaction is permanently recorded on the public <strong>Robinhood Chain (L2)</strong> ledger. Public data includes:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Public wallet address (e.g. <code className="text-xs">0x...</code>).</li>
              <li>Transaction hash (*TxHash*), token bet amounts, and winning payouts history.</li>
            </ul>
            <p className="text-xs text-[#526256] dark:text-slate-400">
              This data can be independently verified by anyone using public block explorers like Robinhood Chain Blockscout.
            </p>
          </section>

          {/* 3. Local Storage & Client Cookies */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Cookie className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">3. Browser Local Storage Preferences</h2>
            </div>
            <p>
              To provide a smooth and personalized user experience, the application stores non-sensitive preferences in your browser's Local Storage:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Custom Profile:</strong> Your chosen display nickname and avatar.</li>
              <li><strong>Appearance:</strong> Dark/Light theme mode preferences and sound effects toggle.</li>
              <li><strong>Terms Agreement:</strong> Confirmation status of Terms of Use & 18+ age verification.</li>
            </ul>
            <p className="text-xs text-[#526256] dark:text-slate-400">
              This data is stored solely on your local device and can be cleared at any time via your browser settings (*Clear Cache / Cookies*).
            </p>
          </section>

          {/* 4. Security & Inquiries */}
          <section className="p-6 rounded-3xl bg-white/70 dark:bg-[#0c1611]/80 backdrop-blur-xl border border-white/80 dark:border-[#718D76]/25 shadow-md space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 text-[#243329] dark:text-white">
              <Mail className="w-5 h-5 text-[#718D76] dark:text-emerald-400" />
              <h2 className="text-base font-black uppercase tracking-wide">4. Security & Support Inquiries</h2>
            </div>
            <p>
              All network communications between the web client and server are secured using high-grade SSL/TLS encryption. If you have any inquiries regarding privacy or decentralization, contact our team:
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@ponspot.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/30 text-xs font-mono font-bold text-[#718D76] dark:text-emerald-400 hover:underline"
              >
                <Mail className="w-4 h-4" />
                <span>support@ponspot.com</span>
              </a>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
          <Link
            href="/terms"
            className="flex items-center gap-1.5 text-[#718D76] dark:text-emerald-400 hover:underline font-bold"
          >
            <span>Read Terms of Use</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <span className="text-[#526256] dark:text-slate-400">© 2026 Ponspot. All rights reserved.</span>
        </div>

      </main>
    </div>
  );
}
