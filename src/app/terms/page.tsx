'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Scale,
  CheckCircle2,
  ExternalLink,
  Feather,
  Compass,
  Swords,
  Coins,
  AlertTriangle,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ROBINHOOD_CHAIN_CONFIG } from '@/lib/web3/contracts';
import { CelestialEmblem } from '@/components/ui/CelestialEmblem';
import { BookplateCorner, CelestialFlourish } from '@/components/ui/CelestialFlourish';

export default function TermsOfUsePage() {
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
              CANON OF TERMS
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
                Liber Legis • Protocol Covenant
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#171513] dark:text-[#E8DFD1] tracking-wide">
                CANON OF TERMS & PROTOCOL COVENANT
              </h1>
              <p className="text-xs text-[#171513]/60 dark:text-[#E8DFD1]/60 font-serif italic mt-0.5">
                Effective Epoch MMXXVI • Applicable to All Inscribing Observers of CashFlip
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#171513]/80 dark:text-[#E8DFD1]/80 leading-relaxed pt-2">
            Read these articles of covenant attentively prior to binding your cryptographic ledger to the <strong className="text-[#171513] dark:text-[#E8DFD1]">CashFlip</strong> sanctuary. By accessing this observatory, participating in Coinflip duels or Celestial Jackpot rounds, communing with our smart contracts, or inscribing wagers, you affirm irrevocable assent to the terms inscribed herein.
          </p>
        </motion.div>

        {/* Section Cards */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-[#171513]/85 dark:text-[#E8DFD1]/85">
          {/* 1. Eligibility */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <ShieldCheck className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                I. Qualification & Age Majority (18+)
              </h2>
            </div>
            <p>
              Communion with the decentralized arenas of CashFlip is reserved strictly for individuals who have achieved at least <strong>eighteen (18) years of age</strong> (or the legal age of majority designated within their sovereign jurisdiction).
            </p>
            <p>
              Each observer bears sole and unmitigated responsibility for ensuring that interaction with decentralized smart contracts, digital tokens, and peer-to-peer wagering does not violate the statutory codes of their geographic territory. Persons situated in restricted jurisdictions where decentralized blockchain gaming is prohibited are strictly barred from participating.
            </p>
          </section>

          {/* 2. Non-Custodial Smart Contract Escrow */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Lock className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                II. Autonomous Non-Custodial Smart Contract Vault
              </h2>
            </div>
            <p>
              CashFlip operates strictly upon the <strong>Robinhood Chain (L2)</strong> ecosystem through trustless, non-custodial smart contracts:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 font-mono text-xs text-[#171513] dark:text-[#E8DFD1]">
              <li>Settlement Currency: <code className="bg-[#E8DFD1] dark:bg-[#141311] px-1.5 py-0.5 rounded border border-[#171513]/10 dark:border-[#E8DFD1]/10">USDG (ERC-20 Token)</code></li>
              <li>Smart Contract Escrow: <code className="bg-[#E8DFD1] dark:bg-[#141311] px-1.5 py-0.5 rounded border border-[#171513]/10 dark:border-[#E8DFD1]/10">Audited CashFlip Vault Protocol</code></li>
              <li>Network Architecture: <code className="bg-[#E8DFD1] dark:bg-[#141311] px-1.5 py-0.5 rounded border border-[#171513]/10 dark:border-[#E8DFD1]/10">Robinhood Testnet L2 (Chain ID: 466)</code></li>
            </ul>
            <p>
              Wagered funds are locked securely within the blockchain smart contract vault. CashFlip maintains <strong>zero custody</strong> over your digital assets. No centralized operator possesses the authority or capability to seize, redirect, or unilaterally freeze user funds held in escrow. Victor dispensations are executed autonomously on-chain.
            </p>
          </section>

          {/* 3. Game Mechanics: Coinflip & Jackpot */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Swords className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                III. Game Modes & Rules of Engagement
              </h2>
            </div>
            <div className="space-y-2.5">
              <div>
                <h3 className="font-semibold text-xs text-[#9E8055] uppercase tracking-wider">A. Coinflip Celestial Duels (PvP & vs AI Smart Contract Vault)</h3>
                <p className="text-xs mt-1">
                  Players create or join 1-on-1 rooms by staking USDG on either <strong>Head (Luna Cat)</strong> or <strong>Tail (Crescent Tail)</strong> with a mathematically exact 50.0% probability. Room creators may duel live peer challengers or instantly challenge the <strong>Smart Contract AI Vault</strong>. If the player wins against the AI, winnings (2.0× return) are disbursed directly from the contract vault reserves.
                </p>
              </div>
              <div className="pt-2 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10">
                <h3 className="font-semibold text-xs text-[#9E8055] uppercase tracking-wider">B. Celestial Jackpot Rounds</h3>
                <p className="text-xs mt-1">
                  Multiple participants inscribe USDG wagers into a communal pool. Each 1 USDG confers 1 lottery ticket. The winning ticket is mathematically chosen by provably fair entropy at round expiry. The probability of victory is directly proportional to ticket share.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Provably Fair Architecture */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <CheckCircle2 className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                IV. Provably Fair Cryptographic Verification
              </h2>
            </div>
            <p>
              All game outcomes are governed by the industry-standard <strong>HMAC-SHA256</strong> commitment protocol:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li><strong>Pre-Commitment:</strong> A high-entropy server seed is generated and its cryptographic SHA-256 hash is published on-chain prior to any bet acceptance. The outcome is predetermined and tamper-proof.</li>
              <li><strong>Post-Round Reveal:</strong> Immediately upon round resolution, the unmasked seed and combined public seed are published for independent mathematical audit.</li>
              <li><strong>Verification Portal:</strong> Observers may reproduce the exact hash calculation and coin landing angle at any time via the embedded Provably Fair Verification modal.</li>
            </ul>
          </section>

          {/* 5. Protocol Fees & Claims */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Compass className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                VI. Dispensations, Protocol Tithes & Claims
              </h2>
            </div>
            <p>
              Dispensations are executed through verifiable cryptographic signatures:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li><strong>Jackpot Protocol Tithe:</strong> A nominal <strong>2.0% protocol tithe</strong> is retained by the smart contract upon Jackpot pool completion to sustain vault liquidity and gas subsidies. The remaining 98.0% is disbursed in full to the victor.</li>
              <li><strong>Coinflip Payouts:</strong> Winners in Coinflip receive 2.0× their stake (or minus nominal network fee where designated).</li>
              <li><strong>Claiming Winnings:</strong> Victor accounts execute an on-chain claim transaction authorized by an ECDSA signature from the game engine. Users are responsible for network gas fees on Robinhood Chain.</li>
            </ul>
          </section>

          {/* 6. Irreversibility */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                VII. Irreversibility of Blockchain Transactions
              </h2>
            </div>
            <p>
              All deposits, wagers, room creations, and join actions broadcast to the Robinhood Chain are final and irrevocable once confirmed in a block. 
            </p>
            <p>
              <strong>Chamber Cancellation:</strong> A Coinflip room creator may cancel and withdraw their open room stake <em>only</em> if no challenger has joined the chamber. Once an opponent or the AI Vault enters the duel, the match commences immediately and cannot be cancelled or refunded.
            </p>
          </section>

          {/* 7. Disclaimer of Warranties */}
          <section className="editorial-card p-6 bg-[#F4EFE6] dark:bg-[#1C1A17] border border-[#171513]/15 dark:border-[#E8DFD1]/15 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#171513]/15 dark:border-[#E8DFD1]/15 text-[#171513] dark:text-[#E8DFD1]">
              <Scale className="w-4 h-4 text-[#9E8055]" />
              <h2 className="text-sm font-serif font-semibold tracking-wider uppercase">
                VIII. Disclaimer of Warranties & Limitation of Liability
              </h2>
            </div>
            <p>
              CashFlip is provided strictly on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind. Participating in cryptocurrency-denominated games carries inherent financial risk, including potential loss of wagered tokens, price volatility, network forks, and smart contract execution bugs.
            </p>
            <p>
              The CashFlip developers and contributors disclaim all liability for any direct, indirect, punitive, or consequential damages arising from blockchain network outages, RPC latency, user wallet mismanagement, or lost private keys. Users must exercise sound financial judgment and wager only what they can afford to lose.
            </p>
          </section>
        </div>

        <CelestialFlourish />

        <div className="text-center text-xs text-[#171513]/60 dark:text-[#E8DFD1]/60 font-serif pt-4">
          <p>© MMXXVI CashFlip L'Observatoire • Inscribed upon Robinhood Chain</p>
        </div>
      </main>
    </div>
  );
}
