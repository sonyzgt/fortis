'use client';

import React from 'react';

export const AmbientLiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Deep Dark Base with Ambient Warm Gold & Champagne Radial Blooms */}
      <div className="absolute top-[-15%] left-[20%] w-[550px] h-[550px] rounded-full bg-[#CDB486]/[0.03] blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] rounded-full bg-[#D8C6A5]/[0.025] blur-[160px]" />
      <div className="absolute top-[45%] left-[-10%] w-[450px] h-[450px] rounded-full bg-[#E8DFCF]/[0.018] blur-[120px]" />

      {/* Floating Translucent Glass Bubbles with Warm Gold & Champagne Refractions */}
      {/* Bubble 1: Upper Left Large */}
      <div
        className="absolute top-[12%] left-[8%] w-36 h-36 rounded-full border border-white/[0.12] animate-bubble-float-1 opacity-40 backdrop-blur-[2px]"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(245, 240, 230, 0.3) 0%, rgba(205, 180, 134, 0.08) 40%, rgba(3, 5, 8, 0.4) 100%)',
          boxShadow:
            'inset 0 2px 3px rgba(245, 240, 230, 0.6), inset 0 -3px 6px rgba(0, 0, 0, 0.5), 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(205, 180, 134, 0.12)',
        }}
      />

      {/* Bubble 2: Upper Right Medium */}
      <div
        className="absolute top-[22%] right-[10%] w-24 h-24 rounded-full border border-white/[0.14] animate-bubble-float-2 opacity-50 backdrop-blur-[2px]"
        style={{
          background:
            'radial-gradient(circle at 35% 25%, rgba(245, 240, 230, 0.32) 0%, rgba(216, 198, 165, 0.08) 45%, rgba(3, 5, 8, 0.4) 100%)',
          boxShadow:
            'inset 0 1.5px 2.5px rgba(245, 240, 230, 0.65), inset 0 -2px 4px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(205, 180, 134, 0.1)',
        }}
      />

      {/* Bubble 3: Lower Left Small */}
      <div
        className="absolute bottom-[28%] left-[12%] w-16 h-16 rounded-full border border-white/[0.1] animate-bubble-float-3 opacity-35"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(245, 240, 230, 0.25) 0%, rgba(205, 180, 134, 0.06) 50%, rgba(3, 5, 8, 0.5) 100%)',
          boxShadow:
            'inset 0 1px 2px rgba(245, 240, 230, 0.5), inset 0 -1px 3px rgba(0, 0, 0, 0.4), 0 6px 18px rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Bubble 4: Center-Right Ambient Large */}
      <div
        className="absolute top-[58%] right-[6%] w-44 h-44 rounded-full border border-white/[0.08] animate-bubble-float-1 opacity-30 backdrop-blur-[3px]"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(245, 240, 230, 0.22) 0%, rgba(205, 180, 134, 0.06) 45%, rgba(3, 5, 8, 0.5) 100%)',
          boxShadow:
            'inset 0 2px 4px rgba(245, 240, 230, 0.5), inset 0 -3px 8px rgba(0, 0, 0, 0.6), 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(205, 180, 134, 0.08)',
        }}
      />

      {/* Bubble 5: Bottom Right Subtle */}
      <div
        className="absolute bottom-[10%] right-[25%] w-20 h-20 rounded-full border border-white/[0.1] animate-bubble-float-2 opacity-35"
        style={{
          background:
            'radial-gradient(circle at 35% 25%, rgba(245, 240, 230, 0.28) 0%, rgba(216, 198, 165, 0.06) 45%, rgba(3, 5, 8, 0.45) 100%)',
          boxShadow:
            'inset 0 1px 2px rgba(245, 240, 230, 0.55), inset 0 -1.5px 3px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
};
