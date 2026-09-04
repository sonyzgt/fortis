'use client';

import React from 'react';

export const CelestialFlourish: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 select-none text-brass opacity-70 ${className}`}>
    <span className="h-[1px] w-12 bg-current opacity-40" />
    <span className="text-xs tracking-[0.25em] font-serif">✦ ☽ ✦</span>
    <span className="h-[1px] w-12 bg-current opacity-40" />
  </div>
);

export const BookplateCorner: React.FC<{
  position?: 'tl' | 'tr' | 'bl' | 'br';
  className?: string;
}> = ({ position, className = '' }) => {
  if (position) {
    const classes = {
      tl: 'top-1.5 left-1.5',
      tr: 'top-1.5 right-1.5',
      bl: 'bottom-1.5 left-1.5',
      br: 'bottom-1.5 right-1.5',
    }[position];

    return (
      <span
        className={`absolute ${classes} text-[9px] text-brass opacity-60 font-serif select-none pointer-events-none ${className}`}
      >
        ✦
      </span>
    );
  }

  // Render all 4 corner markers by default
  return (
    <>
      <span className={`absolute top-1.5 left-1.5 text-[9px] text-[#9E8055] opacity-60 font-serif select-none pointer-events-none ${className}`}>
        ✦
      </span>
      <span className={`absolute top-1.5 right-1.5 text-[9px] text-[#9E8055] opacity-60 font-serif select-none pointer-events-none ${className}`}>
        ✦
      </span>
      <span className={`absolute bottom-1.5 left-1.5 text-[9px] text-[#9E8055] opacity-60 font-serif select-none pointer-events-none ${className}`}>
        ✦
      </span>
      <span className={`absolute bottom-1.5 right-1.5 text-[9px] text-[#9E8055] opacity-60 font-serif select-none pointer-events-none ${className}`}>
        ✦
      </span>
    </>
  );
};
