'use client';

import React from 'react';

interface Cup3DProps {
  isWon?: boolean;
  isLifted?: boolean;
  isShuffling?: boolean;
  isHovered?: boolean;
}

export const Cup3DVisual: React.FC<Cup3DProps> = ({
  isWon = false,
  isLifted = false,
  isShuffling = false,
  isHovered = false,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-end select-none pointer-events-none">
      {/* 3D SVG Casino Cup */}
      <svg
        viewBox="0 0 160 210"
        className="w-full h-full filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.7)] transition-all duration-300"
        style={{
          transform: isHovered ? 'scale(1.03)' : 'scale(1)',
          filter: isWon
            ? 'drop-shadow(0 0 25px rgba(0,231,1,0.6)) drop-shadow(0 15px 30px rgba(0,0,0,0.8))'
            : isHovered
            ? 'drop-shadow(0 0 18px rgba(0,231,1,0.3)) drop-shadow(0 15px 25px rgba(0,0,0,0.7))'
            : undefined,
        }}
      >
        <defs>
          {/* Main Cup Body Gradient (Metallic Dark Teal Titanium) */}
          <linearGradient id="cupBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isWon ? '#154a20' : '#142735'} />
            <stop offset="25%" stopColor={isWon ? '#257d38' : '#234459'} />
            <stop offset="45%" stopColor={isWon ? '#4ade80' : '#457896'} />
            <stop offset="60%" stopColor={isWon ? '#1ea840' : '#2a5068'} />
            <stop offset="85%" stopColor={isWon ? '#14461f' : '#182f40'} />
            <stop offset="100%" stopColor={isWon ? '#0a2310' : '#0e1d28'} />
          </linearGradient>

          {/* Specular Highlight Streak */}
          <linearGradient id="specularGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="50%" stopColor="white" stopOpacity={isWon ? '0.65' : '0.45'} />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Gold / Neon Rim Trim Gradient */}
          <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isWon ? '#009900' : '#8A7045'} />
            <stop offset="25%" stopColor={isWon ? '#00E701' : '#FFD166'} />
            <stop offset="50%" stopColor={isWon ? '#FFFFFF' : '#FFF3D1'} />
            <stop offset="75%" stopColor={isWon ? '#00E701' : '#FFC432'} />
            <stop offset="100%" stopColor={isWon ? '#006600' : '#68512C'} />
          </linearGradient>

          {/* Top Knob Gradient */}
          <radialGradient id="knobGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={isWon ? '#FFFFFF' : '#FFF4D4'} />
            <stop offset="40%" stopColor={isWon ? '#00E701' : '#FFC432'} />
            <stop offset="85%" stopColor={isWon ? '#008800' : '#A3771E'} />
            <stop offset="100%" stopColor={isWon ? '#004400' : '#523C0E'} />
          </radialGradient>

          {/* Base Shadow & Ambient Glow */}
          <radialGradient id="baseRimGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isWon ? '#00E701' : '#FFC432'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isWon ? '#00E701' : '#FFC432'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. TOP KNOB / HANDLE (Spherical Brass Finial) */}
        <ellipse cx="80" cy="24" rx="14" ry="14" fill="url(#knobGrad)" />
        {/* Knob specular shine */}
        <ellipse cx="76" cy="18" rx="4" ry="2.5" fill="white" opacity="0.8" />
        {/* Knob collar */}
        <path
          d="M72,28 L88,28 L85,34 L75,34 Z"
          fill={isWon ? '#009900' : '#A3771E'}
        />

        {/* 2. CUP DOME (Top Cap) */}
        <ellipse cx="80" cy="38" rx="34" ry="10" fill="url(#goldRimGrad)" />
        <ellipse cx="80" cy="37" rx="32" ry="8" fill="url(#cupBodyGrad)" />

        {/* 3. MAIN CUP BODY (Tapered Fluted Bell Shape) */}
        <path
          d="M 48 38 
             Q 44 80, 32 170 
             Q 30 185, 34 190 
             L 126 190 
             Q 130 185, 128 170 
             Q 116 80, 112 38 
             Z"
          fill="url(#cupBodyGrad)"
        />

        {/* 4. METALLIC SPECULAR VERTICAL HIGHLIGHT STREAKS */}
        <path
          d="M 68 39 Q 62 100, 52 188 L 64 188 Q 74 100, 77 39 Z"
          fill="url(#specularGlow)"
          opacity="0.9"
        />
        <path
          d="M 94 39 Q 98 100, 104 188 L 98 188 Q 92 100, 89 39 Z"
          fill="black"
          opacity="0.25"
        />

        {/* 5. HORIZONTAL DECORATIVE RINGS (Casino Engraving) */}
        {/* Upper Ring */}
        <path
          d="M 46 62 Q 80 72, 114 62"
          fill="none"
          stroke="url(#goldRimGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 46 68 Q 80 78, 114 68"
          fill="none"
          stroke={isWon ? '#00E701' : '#FFD166'}
          strokeWidth="1"
          opacity="0.8"
        />

        {/* Center Embossed Crest / FORTIS Diamond Emblem */}
        <g transform="translate(80, 118)">
          <circle cx="0" cy="0" r="17" fill="#0A1822" stroke="url(#goldRimGrad)" strokeWidth="2" />
          {/* Inner Diamond Star */}
          <polygon
            points="0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3"
            fill={isWon ? '#00E701' : '#FFC432'}
          />
          <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
        </g>

        {/* Lower Double Ring */}
        <path
          d="M 37 152 Q 80 166, 123 152"
          fill="none"
          stroke="url(#goldRimGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 36 157 Q 80 171, 124 157"
          fill="none"
          stroke={isWon ? '#00E701' : '#FFD166'}
          strokeWidth="1.2"
          opacity="0.8"
        />

        {/* 6. BASE LIP & BOTTOM RIM (Heavy weighted bottom) */}
        {/* Flared Base Step */}
        <path
          d="M 32 188 L 26 198 Q 80 212, 134 198 L 128 188 Q 80 200, 32 188 Z"
          fill="url(#goldRimGrad)"
        />
        {/* Bottom opening lip bevel */}
        <ellipse cx="80" cy="198" rx="54" ry="10" fill="url(#goldRimGrad)" />
        <ellipse cx="80" cy="199" rx="51" ry="8" fill="#07121A" />

        {/* Ambient Rim Light when hovering or won */}
        {(isWon || isHovered) && (
          <ellipse
            cx="80"
            cy="199"
            rx="56"
            ry="11"
            fill="none"
            stroke={isWon ? '#00E701' : '#00E701'}
            strokeWidth="2.5"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
};
