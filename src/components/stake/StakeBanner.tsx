'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Zap, Play } from 'lucide-react';

const banners = [
  {
    id: 1,
    title: 'FORTIS JACKPOT',
    subtitle: 'MASSIVE MULTIPLAYER POOL',
    description: 'Enter the autonomous liquidity pool. Win big on Robinhood Chain with transparent provably fair draw.',
    cta: 'Play Jackpot',
    href: '/jackpot',
    gradient: 'from-[#1A2C38] via-[#0F212E] to-[#071824]',
    accent: '#FFC432',
    badge: 'HOT POOL',
    img: '/image/jackpot.png',
  },
  {
    id: 2,
    title: '1v1 COINFLIP',
    subtitle: '50/50 INSTANT DUEL',
    description: 'Instant settlement cryptographic duels. Double your balance in one flip with pure fairness.',
    cta: 'Flip Now',
    href: '/coinflip',
    gradient: 'from-[#1A2C38] via-[#0F212E] to-[#071824]',
    accent: '#00E701',
    badge: 'INSTANT',
    img: '/image/flipcoin.png',
  },
  {
    id: 3,
    title: 'FORTIS MINES',
    subtitle: 'CRYPTO MINES ORIGINAL',
    description: 'Uncover refractive gemstones, avoid hidden mines, and cash out anytime with multiplying returns.',
    cta: 'Start Digging',
    href: '/mines',
    gradient: 'from-[#1A2C38] via-[#0F212E] to-[#071824]',
    accent: '#1475E1',
    badge: 'NEW',
    img: '/image/mine.png',
  },
  {
    id: 4,
    title: 'FORTIS CUPS',
    subtitle: 'CLASSIC THIMBLERIG 3D',
    description: 'Track the gold coin under the metallic casino cups. Test your reflexes and multiply your stake.',
    cta: 'Play Cups',
    href: '/cups',
    gradient: 'from-[#1A2C38] via-[#0F212E] to-[#071824]',
    accent: '#A855F7',
    badge: 'HOT',
    img: '/image/cups.png',
  },
];

export function StakeBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const banner = banners[current];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-[#1A2C38] border border-[#213743] shadow-xl min-h-[220px] sm:min-h-[240px] flex items-center">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} opacity-95`} />

      {/* Decorative dots grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col justify-center p-6 sm:p-10 md:px-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 bg-[#071824]/80 border border-[#213743] w-fit">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: banner.accent }}
          />
          <span style={{ color: banner.accent }}>{banner.subtitle}</span>
        </div>

        <h2 className="text-white font-extrabold text-2xl sm:text-4xl leading-tight mb-2 tracking-tight">
          {banner.title}
        </h2>

        <p className="text-[#B1BAD3] text-xs sm:text-sm leading-relaxed mb-6 max-w-xl font-medium">
          {banner.description}
        </p>

        <div>
          <Link
            href={banner.href}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-lg font-bold text-sm text-[#071824] transition-all transform hover:brightness-110 active:scale-95 shadow-lg"
            style={{ backgroundColor: banner.accent }}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{banner.cta}</span>
          </Link>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#071824]/80 border border-[#213743] text-[#B1BAD3] hover:text-white transition-colors z-20"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-[#071824]/80 border border-[#213743] text-[#B1BAD3] hover:text-white transition-colors z-20"
        aria-label="Next banner"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
