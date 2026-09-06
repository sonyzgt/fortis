'use client';

import React from 'react';
import Link from 'next/link';

export function ProtocolFooter() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-[#050608] py-8 px-4 sm:px-8 mt-auto relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#8993A4]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 p-1 flex items-center justify-center">
            <img src="/image/logo.png" alt="KOFUKU" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-sm text-[#F5F0E6]">KOFUKU</span>
            <span className="text-[10px] font-mono text-[#8993A4]">ROBINHOOD CHAIN</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
          <Link href="/jackpot" className="hover:text-[#F5F0E6] transition-colors">
            JACKPOT
          </Link>
          <Link href="/coinflip" className="hover:text-[#F5F0E6] transition-colors">
            COINFLIP
          </Link>
          <Link href="/mines" className="hover:text-[#F5F0E6] transition-colors">
            MINES
          </Link>
          <Link
            href="/docs"
            className="text-[#CDB486] hover:text-[#F5F0E6] font-bold transition-colors inline-flex items-center gap-1"
          >
            DOCS
          </Link>
          <a
            href="https://x.com/kofukudotio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#CDB486] transition-colors"
          >
            TWITTER
          </a>
        </div>

        {/* Network & Copyright */}
        <div className="text-[11px] font-mono text-[#8993A4]/80 text-center md:text-right">
          <div>ROBINHOOD CHAIN (4663) • USDG</div>
          <div className="text-[10px] text-[#8993A4]/60">© 2026 KOFUKU. ALL RIGHTS RESERVED.</div>
        </div>
      </div>
    </footer>
  );
}
