'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  EyeOff,
  Database,
  Cookie,
  Key,
  Compass,
  Moon,
  Sun,
  Radio,
  ServerOff,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { CelestialEmblem } from '@/components/ui/CelestialEmblem';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

export default function PrivacyPolicyPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen overflow-y-auto bg-[#E8DFD1] dark:bg-[#141311] text-[#171513] dark:text-[#E8DFD1] font-serif select-none transition-colors">
      {/* ── Top Masthead ── */}
      <header className="sticky top-0 z-40 h-16 border-b border-[#171513]/20 dark:border-[#E8DFD1]/15 bg-[#E8DFD1] dark:bg-[#181614] px-4 sm:px-8 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4EFE6] dark:bg-[#201E1B] hover:bg-[#DDD2C1] dark:hover:bg-[#2C2824] border border-[#171513]/20 dark:border-[#E8DFD1]/20 text-xs font-serif transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9E8055]" />
            <span>Return to Sanctum</span>
          </Link>
          <div className="h-4 w-[1px] bg-[#171513]/20 dark:bg-[#E8DFD1]/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 border border-[#9E8055] p-0.5 bg-[#F4EFE6] dark:bg-[#201E1B] flex items-center justify-center flex-shrink-0">
              <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-serif font-semibold tracking-wider text-[#171513] dark:text-[#E8DFD1]">
              CASHFLIP OBSERVATOIRE
            </span>
            <span className="px-2 py-0.5 border border-[#9E8055] text-[#9E8055] text-[9px] font-mono tracking-widest uppercase hidden xs:inline-block">
              PRIVACY COVENANT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 sm:w-9 sm:h-9 border border-[#171513]/20 dark:border-[#E8DFD1]/20 bg-[#F4EFE6] dark:bg-[#201E1B] hover:bg-[#E8DFD1] dark:hover:bg-[#2A2621] text-[#171513] dark:text-[#E8DFD1] flex items-center justify-center transition-colors shadow-sm"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#9E8055]" />
            )}
          </button>
        </div>
      </header>

      {/* ── Main Codex Document ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Banner Chapter Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="editorial-frame p-6 sm:p-8 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/20 dark:border-[#9E8055]/30 shadow-sm space-y-3 relative transition-colors"
        >
          <BookplateCorner />

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 border border-[#9E8055] bg-[#E8DFD1] dark:bg-[#141311] p-1 flex items-center justify-center text-[#9E8055] flex-shrink-0 shadow-inner">
              <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[9px] tracking-[0.25em] font-serif uppercase text-[#9E8055] block">
                Sanctum Sovereignty • Data Transparency
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#171513] dark:text-[#E8DFD1] tracking-wide">
                PRIVACY COVENANT & DATA SOVEREIGNTY
              </h1>
              <p className="text-xs text-[#171513]/60 dark:text-[#E8DFD1]/60 font-serif italic mt-0.5">
                Full Decentralization Principle • Zero Civil KYC • Cryptographic Pseudonymity
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#171513]/80 dark:text-[#E8DFD1]/80 leading-relaxed pt-2">
            At <strong className="text-[#171513] dark:text-[#E8DFD1]">CashFlip</strong>, user anonymity and data sovereignty are sacred tenets. Our architecture eliminates civil identity profiling, invasive tracking, and centralized user databases. You interact directly with decentralized smart contracts under your cryptographic pseudonym.
          </p>
        </motion.div>

        {/* Section Cards */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-[#171513]/85 dark:text-[#E8DFD1]/85">
          {/* 1. Zero Personal Data Harvesting */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <EyeOff className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                I. Civil Data We Strictly Refuse to Harvest
              </h2>
            </div>
            <p>
              CashFlip adheres to an uncompromising policy of non-collection:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li><strong>No Legal Names or Civil Records:</strong> We never request real names, physical street addresses, or postal codes.</li>
              <li><strong>No Communication PII:</strong> No phone numbers, mandatory email addresses, or messaging credentials.</li>
              <li><strong>No Government Documentation:</strong> Zero KYC (Know Your Customer), passports, national identity numbers, or biometric facial scans.</li>
              <li><strong>No Traditional Financial Records:</strong> No centralized bank accounts, debit cards, or credit scores.</li>
            </ul>
          </section>

          {/* 2. Absolute Key Sovereignty */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Key className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                II. Absolute Sovereignty of Private Keys
              </h2>
            </div>
            <p>
              Your cryptographic private keys and recovery phrases remain under your exclusive control at all times:
            </p>
            <p>
              Signing requests (e.g. for approving USDG or signing claim transactions) occur entirely within your local Web3 wallet client (MetaMask, Rabby, Coinbase Wallet, Privy, etc.). CashFlip servers <strong>never have access to</strong>, never transmit, and never store your private keys or seed phrases.
            </p>
          </section>

          {/* 3. Public Blockchain Records */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Database className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                III. Public Blockchain Transparency
              </h2>
            </div>
            <p>
              By nature of decentralized protocols, all on-chain interactions on Robinhood Chain (L2) are public and immutable:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 font-mono text-xs">
              <li>Public EVM wallet addresses (e.g., <span className="text-[#9E8055]">0x71C...4b29</span>).</li>
              <li>Transaction signatures, deposit hashes, block confirmations, and prize claim receipts.</li>
            </ul>
            <p>
              These records are permanently inscribed into the distributed ledger and cannot be modified, deleted, or censored by CashFlip or any third party.
            </p>
          </section>

          {/* 4. Client-Side Local Storage */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Cookie className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                IV. Client-Side Browser Storage
              </h2>
            </div>
            <p>
              To maintain custom visual profiles without maintaining invasive central databases, CashFlip stores user interface preferences locally on your machine via HTML5 Local Storage:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li>Chosen callsign / screen name and avatar selection.</li>
              <li>Theme preference (Parchment Light / Nocturnal Dark).</li>
              <li>Sound effect volume and mute states.</li>
            </ul>
            <p>
              You may wipe these preferences at any moment by clearing your browser cache and local storage data.
            </p>
          </section>

          {/* 5. Zero Invasive Trackers */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <ServerOff className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                V. Zero Third-Party Advertising & Trackers
              </h2>
            </div>
            <p>
              CashFlip does not employ third-party behavioral advertising networks, fingerprinting scripts, cross-site trackers, or data broker integrations. We do not sell, rent, monetize, or disclose user activity to marketing entities.
            </p>
          </section>

          {/* 6. Real-Time Ephemeral WebSocket Memory */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Radio className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                VI. Ephemeral Real-Time Network State
              </h2>
            </div>
            <p>
              Real-time room lists, duel animation broadcasts, and live chat dispatches are relayed via WebSocket channels. Chat dispatches are kept in ephemeral memory for the duration of the observatory session and are not compiled into surveillance dossiers.
            </p>
          </section>
        </div>

        <CelestialFlourish />

        <div className="text-center text-xs text-[#171513]/60 dark:text-[#E8DFD1]/60 font-serif pt-4">
          <p>© MMXXVI CashFlip L'Observatoire • Autonomous Cryptographic Sanctuary</p>
        </div>
      </main>
    </div>
  );
}
