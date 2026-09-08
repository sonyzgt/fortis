'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Scale,
  Lock,
  CheckCircle2,
  Swords,
  Coins,
  AlertTriangle,
  Eye,
  Database,
  Sparkles,
  Bomb,
  Layers,
  Flame,
  Trophy,
} from 'lucide-react';
import { ProtocolHeader } from '@/components/protocol/ProtocolHeader';
import { ProtocolFooter } from '@/components/protocol/ProtocolFooter';
import { AmbientLiquidBackground } from '@/components/ui/AmbientLiquidBackground';
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

export default function DocsPage() {
  const { account, connectWallet } = useCashFlipWeb3();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'all'>('terms');
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Sync tab from URL hash or query params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const tabParam = search.get('tab')?.toLowerCase();

      if (hash === '#privacy' || tabParam === 'privacy') {
        setActiveTab('privacy');
      } else if (hash === '#terms' || tabParam === 'terms') {
        setActiveTab('terms');
      } else if (hash === '#all' || tabParam === 'all') {
        setActiveTab('all');
      }
    }
  }, []);

  const handleTabChange = (tab: 'terms' | 'privacy' | 'all') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      url.hash = tab;
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-[#030508] text-[#F5F0E6] font-sans selection:bg-[#CDB486] selection:text-[#030508] flex flex-col relative overflow-x-hidden">
      {/* Ambient Liquid Glass Atmospheric Bubbles */}
      <AmbientLiquidBackground />

      {/* Header */}
      <ProtocolHeader
        currentRoute="docs"
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10 relative z-10">
        {/* Hero Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-capsule border-white/10 text-xs font-mono text-[#CDB486] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CDB486] animate-pulse" />
            OFFICIAL DOCUMENTATION
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F5F0E6] uppercase">
            KOFUKU <span className="text-[#CDB486]">DOCS</span>
          </h1>

          <p className="text-sm sm:text-base text-[#8993A4] leading-relaxed max-w-xl mx-auto">
            Comprehensive legal framework, rules of engagement, and privacy charter governing the Kofuku non-custodial gaming platform on Robinhood Chain.
          </p>

          {/* Interactive Tab Switcher */}
          <div className="pt-3 flex items-center justify-center">
            <div className="glass-capsule p-1.5 rounded-full inline-flex items-center gap-1.5 shadow-xl border border-white/10">
              <button
                type="button"
                onClick={() => handleTabChange('terms')}
                className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'glass-pill-active shadow-lg'
                    : 'glass-pill-inactive hover:text-[#F5F0E6]'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>TERMS OF SERVICE</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('privacy')}
                className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'glass-pill-active shadow-lg'
                    : 'glass-pill-inactive hover:text-[#F5F0E6]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PRIVACY POLICY</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'glass-pill-active shadow-lg'
                    : 'glass-pill-inactive hover:text-[#F5F0E6]'
                }`}
                title="View Both Documents Together"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ALL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-12">
          {/* ══════════════════════════════════════════════════════════════
              TERMS OF SERVICE SECTION
              ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'terms' || activeTab === 'all') && (
            <motion.section
              id="terms"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Section Header Card */}
              <div className="glass-capsule rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/30 flex items-center justify-center text-[#CDB486]">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F0E6]">
                        TERMS OF SERVICE
                      </h2>
                      <p className="text-xs text-[#8993A4] font-mono mt-0.5">
                        Effective 2026 • Governs all smart contract interactions on Kofuku
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#CDB486]/10 border border-[#CDB486]/20 text-[10px] font-mono text-[#CDB486] font-bold uppercase">
                    ROBINHOOD CHAIN (4663)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#8993A4] leading-relaxed">
                  Please read these Terms of Service attentively prior to connecting your Web3 wallet or interacting with the Kofuku platform. By using this website, participating in Coinflip duels, Celestial Jackpot rounds, or Mines games, you affirm your assent to these terms.
                </p>
              </div>

              {/* Terms Articles */}
              <div className="space-y-4">
                {/* 1. Non-Custodial Architecture */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <h3>I. Non-Custodial Smart Contract Architecture</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Kofuku operates strictly upon the <strong className="text-[#F5F0E6]">Robinhood Chain (Chain ID: 4663)</strong> ecosystem through decentralized, non-custodial smart contracts. Wagered funds are deposited directly into smart contract vaults. Kofuku maintains zero custody over your digital assets. No centralized operator possesses the authority or capability to seize, redirect, or freeze user balances. Payouts and disbursements execute autonomously on-chain.
                  </p>
                  <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[11px] font-mono text-[#8993A4] space-y-1">
                    <div>• Settlement Currency: <span className="text-[#CDB486]">{TOKEN_SYMBOL} (ERC-20 Token, 18 Decimals)</span></div>
                    <div>• Token Address: <span className="text-[#F5F0E6]">0x69ed124e3d013b06e05aeef5e6b784ac4ab20197</span></div>
                    <div>• Minimum Wager: <span className="text-[#CDB486]">100,000 {TOKEN_SYMBOL} (100k)</span></div>
                    <div>• Burn Destination: <span className="text-amber-400">0x000000000000000000000000000000000000dEaD</span></div>
                    <div>• Smart Contract Escrow: <span className="text-[#F5F0E6]">Audited Kofuku Smart Vault</span></div>
                    <div>• Execution Model: <span className="text-[#F5F0E6]">Automated On-Chain Settlement with 2.0% Burn</span></div>
                  </div>
                </div>

                {/* 2. Game Rules & Mechanics */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-4">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Swords className="w-4 h-4" />
                    <h3>II. Game Modes & Rules of Engagement</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Coinflip */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-[#F5F0E6]">
                        <Coins className="w-4 h-4 text-[#CDB486]" />
                        <span>Coinflip Duels</span>
                      </div>
                      <p className="text-[11px] text-[#8993A4] leading-relaxed">
                        1-on-1 player duels with mathematically exact 50.0% probability on Head or Tail. Challengers can duel live peers or instantly challenge the autonomous Smart Contract AI Vault. Minimum stake is 100,000 {TOKEN_SYMBOL}.
                      </p>
                    </div>

                    {/* Jackpot */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-[#F5F0E6]">
                        <Sparkles className="w-4 h-4 text-[#CDB486]" />
                        <span>Celestial Jackpot</span>
                      </div>
                      <p className="text-[11px] text-[#8993A4] leading-relaxed">
                        Multiple participants contribute {TOKEN_SYMBOL} wagers to a shared prize pool (minimum 100,000 {TOKEN_SYMBOL}). Each 1 {TOKEN_SYMBOL} confers 1 ticket. Winning ticket is mathematically determined at round timer expiry based on provably fair entropy.
                      </p>
                    </div>

                    {/* Mines */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-[#F5F0E6]">
                        <Bomb className="w-4 h-4 text-[#CDB486]" />
                        <span>Mines Arena</span>
                      </div>
                      <p className="text-[11px] text-[#8993A4] leading-relaxed">
                        5×5 grid with 25 tiles. Uncover safe diamond tiles to compound your multiplier. Players can cash out accumulated yields at any point before detonating a mine. Minimum wager is 100,000 {TOKEN_SYMBOL}.
                      </p>
                    </div>

                    {/* Cups */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-[#F5F0E6]">
                        <Trophy className="w-4 h-4 text-[#CDB486]" />
                        <span>Cups Arena</span>
                      </div>
                      <p className="text-[11px] text-[#8993A4] leading-relaxed">
                        3 glass cups concealing 1 KOFUKU emblem. Players get 2 chances to uncover the logo for a 1.47x multiplier, or 1 chance high-risk for 2.94x. Minimum wager is 100,000 {TOKEN_SYMBOL}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Provably Fair */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <h3>III. Provably Fair Cryptographic Verification</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    All game outcomes are governed by the industry-standard <strong className="text-[#F5F0E6]">HMAC-SHA256</strong> commitment scheme:
                  </p>
                  <ul className="space-y-2 text-xs text-[#8993A4]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Pre-Commitment:</strong> A high-entropy server seed is generated and its cryptographic SHA-256 hash is published on-chain prior to bet placement. The outcome is tamper-proof and immutable.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Post-Round Reveal:</strong> Immediately following round resolution, the unmasked seed and combined public seed are published for open mathematical verification.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Verification Tool:</strong> Players can reproduce the exact outcome computation at any time via the embedded Provably Fair audit modal.</span>
                    </li>
                  </ul>
                </div>

                {/* 4. Deflationary Burn Mechanism */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h3>IV. 2.0% Deflationary Burn & Autonomous Claims</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Kofuku operates a permanent deflationary token model. On every game resolution and prize claim (Jackpot, Coinflip, and Mines), a fixed <strong className="text-amber-400 font-bold">2.0% burn fee</strong> is automatically deducted and transferred directly to the Ethereum Dead Wallet (<span className="text-[#F5F0E6] font-mono">0x000000000000000000000000000000000000dEaD</span>), permanently destroying the tokens from circulating supply.
                  </p>
                  <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl text-[11px] font-mono text-[#8993A4] space-y-1">
                    <div>• Burn Destination: <span className="text-amber-400">0x000000000000000000000000000000000000dEaD</span></div>
                    <div>• Winner Net Payout: <span className="text-[#F5F0E6]">98.0% of gross prize disbursed directly to winner</span></div>
                    <div>• Deflationary Impact: <span className="text-[#CDB486]">Circulating supply of {TOKEN_SYMBOL} permanently decreases with every game played</span></div>
                  </div>
                </div>

                {/* 5. Age & Eligibility */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <h3>V. Eligibility & Age Requirements</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    You must be at least <strong className="text-[#F5F0E6]">18 years of age</strong> (or the age of legal majority in your jurisdiction) to interact with smart contracts on Kofuku. It is each participant&apos;s sole responsibility to comply with local laws and regulations concerning Web3 gaming and decentralized transactions.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PRIVACY POLICY SECTION
              ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'privacy' || activeTab === 'all') && (
            <motion.section
              id="privacy"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 pt-4"
            >
              {/* Section Header Card */}
              <div className="glass-capsule rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/30 flex items-center justify-center text-[#CDB486]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F0E6]">
                        PRIVACY DIRECTIVE
                      </h2>
                      <p className="text-xs text-[#8993A4] font-mono mt-0.5">
                        Zero Tracking • Non-Custodial • Decentralized Privacy Standards
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#CDB486]/10 border border-[#CDB486]/20 text-[10px] font-mono text-[#CDB486] font-bold uppercase">
                    NO COOKIES • NO PII
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#8993A4] leading-relaxed">
                  Kofuku was engineered from the ground up on the principle of algorithmic autonomy and minimal data footprint. We do not require registration, do not collect personal identities, and employ no tracking cookies.
                </p>
              </div>

              {/* Privacy Articles */}
              <div className="space-y-4">
                {/* 1. Core Philosophy */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Eye className="w-4 h-4" />
                    <h3>I. Core Privacy Philosophy</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    We believe financial autonomy requires uncompromising privacy. Kofuku does not request your name, email address, physical location, phone number, or government-issued credentials. Interactions occur strictly between your self-custodied Web3 wallet and open-source smart contracts.
                  </p>
                </div>

                {/* 2. What We Collect */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <h3>II. Information Handled & Stored</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-[#8993A4]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Public EVM Address:</strong> Your public wallet address is read to verify {TOKEN_SYMBOL} balance and smart contract approvals.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Client-Side Local Storage:</strong> Profile nicknames, custom avatars, and UI preferences are stored exclusively on your device&apos;s local browser storage (localStorage). They are never transmitted to corporate databases.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#CDB486] font-mono font-bold">•</span>
                      <span><strong className="text-[#F5F0E6]">Zero Advertising Trackers:</strong> We deploy no Google Analytics, no Facebook Pixels, and no behavioral surveillance scripts.</span>
                    </li>
                  </ul>
                </div>

                {/* 3. Blockchain Transparency */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <h3>III. Public Blockchain Transparency</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    By nature of public blockchains, transactions executed on Robinhood Chain (deposits, wagers, prize claims) are permanently inscribed into the distributed ledger. These public cryptographic records cannot be altered, deleted, or censored by Kofuku or any intermediary.
                  </p>
                </div>

                {/* 4. Cryptographic Integrity */}
                <div className="glass-capsule rounded-2xl p-6 border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#CDB486] font-heading font-bold text-sm uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <h3>IV. Cryptographic Integrity & Communications</h3>
                  </div>
                  <p className="text-xs text-[#8993A4] leading-relaxed">
                    Live Dispatch community broadcasts and game event streams are broadcast in realtime via encrypted WebSocket connections. Chat messages are transient and strictly for community banter during live rounds.
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* Back to Home Action */}
        <div className="pt-6 pb-4 flex items-center justify-center border-t border-white/[0.06]">
          <Link
            href="/"
            className="glass-capsule px-6 py-2.5 rounded-full text-xs font-semibold text-[#E8DFCF] hover:text-[#CDB486] hover:border-[#CDB486]/40 transition-colors inline-flex items-center gap-2"
          >
            <span>← Return to Home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <ProtocolFooter />

      {/* Wallet Select Modal */}
      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSelect={(type) => {
          connectWallet(type);
          setShowWalletModal(false);
        }}
      />
    </div>
  );
}
