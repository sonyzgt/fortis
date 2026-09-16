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
import { WalletSelectModal } from '@/components/cashflip/WalletSelectModal';
import { useCashFlipWeb3 } from '@/context/CashFlipWeb3Context';
import { TOKEN_SYMBOL, getCashFlipTokenAddress } from '@/lib/web3/contracts';

export default function DocsPage() {
  const { account, connectWallet } = useCashFlipWeb3();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'all'>('terms');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [configuredToken, setConfiguredToken] = useState<string>('');

  useEffect(() => {
    setConfiguredToken(getCashFlipTokenAddress());
  }, []);

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
    <div className="min-h-screen bg-[#071824] text-white font-sans selection:bg-[#00E701] selection:text-[#071824] flex flex-col">
      {/* Top Bar Header */}
      <ProtocolHeader
        currentRoute="docs"
        onOpenWalletModal={() => setShowWalletModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Banner */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F212E] border border-[#213743] text-[11px] font-bold text-[#00E701] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E701] animate-pulse" />
            OFFICIAL DOCUMENTATION
          </div>

          <h1 className="text-white font-extrabold text-3xl sm:text-5xl tracking-tight uppercase">
            FORTIS <span className="text-[#00E701]">DOCS</span>
          </h1>

          <p className="text-sm text-[#B1BAD3] leading-relaxed">
            Comprehensive legal framework, provably fair mechanics, and privacy charter governing the FORTIS non-custodial gaming platform on Robinhood Chain.
          </p>

          {/* Interactive Tab Switcher */}
          <div className="pt-2 flex items-center justify-center">
            <div className="bg-[#0F212E] border border-[#213743] p-1 rounded-lg inline-flex items-center gap-1 shadow-md">
              <button
                type="button"
                onClick={() => handleTabChange('terms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-[#1A2C38] text-white shadow-sm'
                    : 'text-[#B1BAD3] hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>TERMS OF SERVICE</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('privacy')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-[#1A2C38] text-white shadow-sm'
                    : 'text-[#B1BAD3] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PRIVACY POLICY</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#1A2C38] text-white shadow-sm'
                    : 'text-[#B1BAD3] hover:text-white'
                }`}
                title="View All Documents"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ALL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-8">
          {/* TERMS OF SERVICE SECTION */}
          {(activeTab === 'terms' || activeTab === 'all') && (
            <motion.section
              id="terms"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Section Header Card */}
              <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] shadow-md space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#213743] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#00E701]/10 border border-[#00E701]/30 flex items-center justify-center text-[#00E701]">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-white">
                        TERMS OF SERVICE
                      </h2>
                      <p className="text-xs text-[#B1BAD3] font-mono mt-0.5">
                        Effective 2026 • Governs all smart contract interactions on FORTIS
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-md bg-[#071824] border border-[#213743] text-[10px] font-mono text-[#00E701] font-bold uppercase">
                    ROBINHOOD CHAIN (4663)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#B1BAD3] leading-relaxed">
                  Please read these Terms of Service attentively prior to connecting your Web3 wallet or interacting with the FORTIS platform. By using this website, participating in Coinflip duels, Jackpot rounds, or Mines games, you affirm your assent to these terms.
                </p>
              </div>

              {/* Terms Articles */}
              <div className="space-y-4">
                {/* 1. Non-Custodial Architecture */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    <h3>I. Non-Custodial Smart Contract Architecture</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    FORTIS operates strictly upon the <strong className="text-white">Robinhood Chain (Chain ID: 4663)</strong> ecosystem through decentralized, non-custodial smart contracts. Wagered funds are deposited directly into smart contract vaults. FORTIS maintains zero custody over your digital assets. No centralized operator possesses the authority or capability to seize, redirect, or freeze user balances. Payouts and disbursements execute autonomously on-chain.
                  </p>
                  <div className="p-3 bg-[#071824] border border-[#213743] rounded-lg text-[11px] font-mono text-[#B1BAD3] space-y-1">
                    <div>• Settlement Currency: <span className="text-[#00E701]">{TOKEN_SYMBOL} (ERC-20 Token, 18 Decimals)</span></div>
                    <div>• Token Address: <span className="text-white font-mono">{configuredToken || 'Configurable in Admin Panel (/kontol)'}</span></div>
                    <div>• Minimum Wager: <span className="text-[#00E701]">100,000 {TOKEN_SYMBOL} (100k)</span></div>
                    <div>• Burn Destination: <span className="text-amber-400">0x000000000000000000000000000000000000dEaD</span></div>
                    <div>• Smart Contract Escrow: <span className="text-white">Autonomous Verified Vault</span></div>
                    <div>• Execution Model: <span className="text-white">Automated On-Chain Settlement with 2.0% Burn</span></div>
                  </div>
                </div>

                {/* 2. Game Modes */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-4">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Swords className="w-4 h-4" />
                    <h3>II. Game Modes & Rules of Engagement</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Coinflip */}
                    <div className="p-4 rounded-lg bg-[#0F212E] border border-[#213743] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Coins className="w-4 h-4 text-[#00E701]" />
                        <span>Coinflip Duels</span>
                      </div>
                      <p className="text-[11px] text-[#B1BAD3] leading-relaxed">
                        1-on-1 player duels with mathematically exact 50.0% probability on Head or Tail. Challengers can duel live peers or challenge the autonomous Smart Contract AI Vault.
                      </p>
                    </div>

                    {/* Jackpot */}
                    <div className="p-4 rounded-lg bg-[#0F212E] border border-[#213743] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Sparkles className="w-4 h-4 text-[#FFC432]" />
                        <span>Jackpot</span>
                      </div>
                      <p className="text-[11px] text-[#B1BAD3] leading-relaxed">
                        Multiple participants contribute {TOKEN_SYMBOL} wagers to a shared prize pool. Each token confers tickets. Winning ticket is mathematically drawn at round expiry.
                      </p>
                    </div>

                    {/* Mines */}
                    <div className="p-4 rounded-lg bg-[#0F212E] border border-[#213743] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Bomb className="w-4 h-4 text-[#1475E1]" />
                        <span>Mines</span>
                      </div>
                      <p className="text-[11px] text-[#B1BAD3] leading-relaxed">
                        5×5 grid with 25 tiles. Uncover safe diamond tiles to multiply your wager. Players can cash out accumulated yields at any point before detonating a mine.
                      </p>
                    </div>

                    {/* Cups */}
                    <div className="p-4 rounded-lg bg-[#0F212E] border border-[#213743] space-y-2">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <Trophy className="w-4 h-4 text-[#E74C3C]" />
                        <span>Cups</span>
                      </div>
                      <p className="text-[11px] text-[#B1BAD3] leading-relaxed">
                        3 cups concealing 1 FORTIS emblem. Track the shuffle and pick the correct cup to uncover the logo for a 2.94× multiplier.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Provably Fair */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <h3>III. Provably Fair Cryptographic Verification</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    All game outcomes are governed by the industry-standard <strong className="text-white">HMAC-SHA256</strong> commitment scheme:
                  </p>
                  <ul className="space-y-2 text-xs text-[#B1BAD3]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Pre-Commitment:</strong> A high-entropy server seed is generated and its cryptographic hash is published prior to bet placement. The outcome is tamper-proof.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Post-Round Reveal:</strong> Immediately following round resolution, the unmasked seed and combined public seed are published for open mathematical verification.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Verification Tool:</strong> Players can reproduce the exact outcome computation at any time via the Provably Fair audit modal.</span>
                    </li>
                  </ul>
                </div>

                {/* 4. Deflationary Burn */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h3>IV. 2.0% Deflationary Burn & Autonomous Claims</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    FORTIS operates a permanent deflationary token model. On every game resolution, a fixed <strong className="text-amber-400 font-bold">2.0% burn fee</strong> is automatically deducted and transferred directly to the Dead Wallet (<span className="text-white font-mono">0x000000000000000000000000000000000000dEaD</span>), permanently destroying the tokens from circulating supply.
                  </p>
                </div>

                {/* 5. Age & Eligibility */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-[#FFC432]" />
                    <h3>V. Eligibility & Age Requirements</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    You must be at least <strong className="text-white">18 years of age</strong> (or the age of legal majority in your jurisdiction) to interact with smart contracts on FORTIS. It is each participant&apos;s sole responsibility to comply with local laws and regulations concerning Web3 gaming and decentralized transactions.
                  </p>
                </div>
              </div>
            </motion.section>
          )}

          {/* PRIVACY POLICY SECTION */}
          {(activeTab === 'privacy' || activeTab === 'all') && (
            <motion.section
              id="privacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-2"
            >
              {/* Section Header Card */}
              <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] shadow-md space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#213743] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#00E701]/10 border border-[#00E701]/30 flex items-center justify-center text-[#00E701]">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-white">
                        PRIVACY DIRECTIVE
                      </h2>
                      <p className="text-xs text-[#B1BAD3] font-mono mt-0.5">
                        Zero Tracking • Non-Custodial • Decentralized Privacy Standards
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-md bg-[#071824] border border-[#213743] text-[10px] font-mono text-[#00E701] font-bold uppercase">
                    NO COOKIES • NO PII
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#B1BAD3] leading-relaxed">
                  FORTIS was engineered from the ground up on the principle of algorithmic autonomy and minimal data footprint. We do not require registration, do not collect personal identities, and employ no tracking cookies.
                </p>
              </div>

              {/* Privacy Articles */}
              <div className="space-y-4">
                {/* 1. Core Philosophy */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Eye className="w-4 h-4" />
                    <h3>I. Core Privacy Philosophy</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    We believe financial autonomy requires uncompromising privacy. FORTIS does not request your name, email address, physical location, phone number, or government-issued credentials. Interactions occur strictly between your self-custodied Web3 wallet and open-source smart contracts.
                  </p>
                </div>

                {/* 2. What We Collect */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <h3>II. Information Handled & Stored</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-[#B1BAD3]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Public EVM Address:</strong> Your public wallet address is read to verify {TOKEN_SYMBOL} balance and smart contract approvals.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Client-Side Local Storage:</strong> Profile nicknames, custom avatars, and UI preferences are stored exclusively on your device&apos;s local browser storage (localStorage). They are never transmitted to corporate databases.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#00E701] font-mono font-bold">•</span>
                      <span><strong className="text-white">Zero Advertising Trackers:</strong> We deploy no Google Analytics, no Facebook Pixels, and no behavioral surveillance scripts.</span>
                    </li>
                  </ul>
                </div>

                {/* 3. Blockchain Transparency */}
                <div className="bg-[#1A2C38] rounded-xl p-6 border border-[#213743] space-y-3">
                  <div className="flex items-center gap-2.5 text-[#00E701] font-bold text-sm uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <h3>III. Public Blockchain Transparency</h3>
                  </div>
                  <p className="text-xs text-[#B1BAD3] leading-relaxed">
                    By nature of public blockchains, transactions executed on Robinhood Chain (deposits, wagers, prize claims) are permanently inscribed into the distributed ledger. These public cryptographic records cannot be altered, deleted, or censored by FORTIS or any intermediary.
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* Back to Home Button */}
        <div className="pt-4 flex items-center justify-center border-t border-[#213743]">
          <Link
            href="/"
            className="px-5 py-2 rounded-lg text-xs font-semibold text-[#B1BAD3] hover:text-white bg-[#0F212E] hover:bg-[#1A2C38] border border-[#213743] transition-colors inline-flex items-center gap-2"
          >
            <span>← Return to Casino Lobby</span>
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
