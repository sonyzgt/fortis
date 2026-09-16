'use client';

import React from 'react';
import Link from 'next/link';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

export function ProtocolFooter() {
  return (
    <footer className="w-full border-t border-[#213743] bg-[#0F212E] py-10 px-6 sm:px-10 mt-auto text-xs text-[#B1BAD3]">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#213743]">
          {/* Logo & Network (Matching Sidebar) */}
          <div className="flex flex-col gap-1.5">
            <div className="h-10 flex items-center">
              <img
                src="/image/sidebar.png"
                alt="FORTIS"
                className="h-full w-auto object-contain max-w-[170px]"
              />
            </div>
            <div className="text-[11px] text-[#557086] font-mono pl-0.5">
              Provably Fair • Robinhood Chain (4663)
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-5 text-xs font-semibold text-[#B1BAD3]">
            <Link href="/jackpot" className="hover:text-white transition-colors">
              Jackpot
            </Link>
            <Link href="/coinflip" className="hover:text-white transition-colors">
              Coinflip
            </Link>
            <Link href="/mines" className="hover:text-white transition-colors">
              Mines
            </Link>
            <Link href="/cups" className="hover:text-white transition-colors">
              Cups
            </Link>
            <Link href="/docs" className="hover:text-[#00E701] transition-colors">
              Fairness & Docs
            </Link>
            <a
              href="https://x.com/play_fortis"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DA1F2] transition-colors"
            >
              Twitter / X
            </a>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#557086]">
          <p>
            © 2026 FORTIS Protocol. High performance non-custodial gaming settling in {TOKEN_SYMBOL}.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E701]" />
              Smart Contracts Live
            </span>
            <span>18+ Play Responsibly</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
