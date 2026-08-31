'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PotParticipant, PastRound, WinnerInfo } from '@/types/jackpot';
import { useSound } from '@/context/SoundContext';

interface PlayerCarouselProps {
  participants: PotParticipant[];
  isSpinning?: boolean;
  winner?: WinnerInfo | null;
}

// ─────────────────────────────────────────────
// Build reel of cards proportional to tickets
// ─────────────────────────────────────────────
function buildCardReel(participants: PotParticipant[]): PotParticipant[] {
  if (participants.length === 0) return [];
  if (participants.length === 1) return [participants[0]];

  const totalTickets = participants.reduce((sum, p) => sum + p.ticketCount, 0);
  if (totalTickets <= 0) return participants;

  const targetSize = Math.max(30, Math.min(60, Math.max(participants.length * 6, totalTickets)));

  const cardCounts = participants.map((p) => {
    const raw = (p.ticketCount / totalTickets) * targetSize;
    return {
      participant: p,
      count: Math.max(1, Math.round(raw)),
    };
  });

  let currentTotal = cardCounts.reduce((s, c) => s + c.count, 0);
  while (currentTotal < targetSize) {
    cardCounts.sort((a, b) => b.participant.ticketCount - a.participant.ticketCount);
    cardCounts[0].count++;
    currentTotal++;
  }
  while (currentTotal > targetSize && cardCounts.some((c) => c.count > 1)) {
    cardCounts.sort((a, b) => b.count - a.count);
    if (cardCounts[0].count > 1) {
      cardCounts[0].count--;
      currentTotal--;
    } else {
      break;
    }
  }

  const reel: PotParticipant[] = [];
  cardCounts.forEach(({ participant, count }) => {
    for (let i = 0; i < count; i++) {
      reel.push(participant);
    }
  });

  const seedStr = participants.map((p) => `${p.playerId}:${p.ticketCount}`).join(';');
  let seed = 5381;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) + seed + seedStr.charCodeAt(i)) >>> 0;
  }
  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed & 0xfffffff) / 0x10000000;
  };

  for (let i = reel.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [reel[i], reel[j]] = [reel[j], reel[i]];
  }

  return reel;
}

// Continuous 3D perspective mapping function (Exact 5 full cards + 2 edge-cropped cards layout)
function get3DTransform(p: number) {
  const absP = Math.abs(p);

  const R = 860; // Wide cylinder radius in px
  const angleStep = 0.225; // Linear card separation ~191px per slot
  const theta = p * angleStep;

  const translateX = Math.sin(theta) * R;
  const translateZ = (Math.cos(theta) - 1) * R - (absP * 3); // Sleek, subtle 3D cylindrical arc depth
  const rotateY = (theta * 180) / Math.PI * 0.7; // Gentle tangent angle along cylinder
  const scale = Math.max(0.88, 1.02 - absP * 0.035);

  let opacity = 1.0;
  if (absP <= 3.4) {
    opacity = 1.0;
  } else {
    opacity = Math.max(0, 0.8 - (absP - 3.4) * 0.9);
  }

  // Keep brightness high so light cards stay pure, crisp, and fresh (never dirty gray)
  const brightness = Math.max(0.92, 1.0 - absP * 0.02);
  const zIndex = Math.round(100 - absP * 10);

  return { translateX, translateZ, rotateY, scale, opacity, brightness, zIndex };
}

export const PlayerCarousel: React.FC<PlayerCarouselProps> = ({
  participants,
  isSpinning,
  winner,
}) => {
  const { playTick, playSuspenseRiser, playRollStart, playWin } = useSound();

  const cardReel = useMemo(() => buildCardReel(participants), [participants]);
  const reelLen = cardReel.length;

  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastTickCardRef = useRef(0);

  const isDeceleratingRef = useRef(false);
  const spinStartOffsetRef = useRef(0);
  const spinTargetOffsetRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const spinDurationRef = useRef(6500);

  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasLandedWinner, setHasLandedWinner] = useState(false);
  const [isDarkening, setIsDarkening] = useState(false);

  useEffect(() => {
    let rollDelayTimer: NodeJS.Timeout | null = null;

    if (isSpinning && reelLen > 0) {
      setHasLandedWinner(false);
      setIsDarkening(true);

      // 1. Play dramatic cinematic suspense riser as the box darkens
      playSuspenseRiser();

      const norm = (str?: string) => (str || '').toLowerCase().trim();
      const winnerId = norm(winner?.playerId || winner?.walletAddress);

      let winnerIndices = cardReel
        .map((p, idx) =>
          (norm(p.playerId) === winnerId || norm(p.walletAddress) === winnerId ? idx : -1)
        )
        .filter((idx) => idx !== -1);

      if (winnerIndices.length === 0) {
        winnerIndices = [0];
      }

      const startOffset = offsetRef.current;
      spinStartOffsetRef.current = startOffset;
      spinDurationRef.current = 10500;

      // High-speed start through 50-90 cards (Speed 100 down to 0)
      const minShifts = Math.max(50, Math.min(reelLen * 4.5, 90));
      let finalTarget = Math.ceil(startOffset + minShifts);
      const remainder = ((finalTarget % reelLen) + reelLen) % reelLen;
      const targetRemainder = winnerIndices[0];
      let diff = targetRemainder - remainder;
      if (diff < 0) diff += reelLen;
      finalTarget += diff;

      if (finalTarget - startOffset < 35) {
        finalTarget += reelLen;
      }

      spinTargetOffsetRef.current = finalTarget;

      // 2. Dramatic 950ms blackout pause, then initiate high-speed wheel roll!
      rollDelayTimer = setTimeout(() => {
        playRollStart();
        spinStartTimeRef.current = performance.now();
        isDeceleratingRef.current = true;
      }, 950);
    } else if (!isSpinning) {
      isDeceleratingRef.current = false;
      setIsDarkening(false);
    }

    return () => {
      if (rollDelayTimer) clearTimeout(rollDelayTimer);
    };
  }, [isSpinning, winner?.playerId, winner?.walletAddress, reelLen, playSuspenseRiser, playRollStart]);

  useEffect(() => {
    const animate = (now: number) => {
      const dt = lastTimeRef.current ? Math.min((now - lastTimeRef.current) / 1000, 0.05) : 0;
      lastTimeRef.current = now;

      if (isDeceleratingRef.current) {
        const elapsed = now - spinStartTimeRef.current;
        const duration = spinDurationRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

        // Extended slow-motion curve: smooth deceleration from Speed 100 to 0
        const oneMinusP = 1 - progress;
        const eased = 1 - Math.pow(oneMinusP, 5.6);

        const totalDist = spinTargetOffsetRef.current - spinStartOffsetRef.current;
        offsetRef.current = spinStartOffsetRef.current + totalDist * eased;

        const currentSpeed = (totalDist / (duration / 1000)) * 5.6 * Math.pow(oneMinusP, 4.6);

        const currentCenterCard = Math.floor(offsetRef.current + 0.5);
        if (currentCenterCard !== lastTickCardRef.current) {
          lastTickCardRef.current = currentCenterCard;
          if (currentSpeed < 18 && currentSpeed > 0.003) {
            playTick();
          }
        }

        if (progress >= 1) {
          offsetRef.current = spinTargetOffsetRef.current;
          isDeceleratingRef.current = false;
          setHasLandedWinner(true);
          playWin();
        }
      } else if (!hasLandedWinner && !isSpinning) {
        // Continuous smooth conveyor drift when waiting (0 players, 1 player, or before spin)
        offsetRef.current += 0.45 * dt;
      }

      setCurrentOffset(offsetRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasLandedWinner, isSpinning, playTick, playWin]);

  if (participants.length === 0) {
    const minCard = Math.floor(currentOffset - 4);
    const maxCard = Math.ceil(currentOffset + 4);
    const visiblePlaceholders = [];

    for (let i = minCard; i <= maxCard; i++) {
      const relPos = i - currentOffset;
      if (Math.abs(relPos) > 3.8) continue;
      visiblePlaceholders.push({
        key: `placeholder-${i}`,
        relPos,
        isCenter: Math.abs(relPos) < 0.45,
      });
    }

    return (
      <div className="relative w-full my-4 overflow-visible">
        <CarouselIndicatorPin isSpinning={false} />
        <div className="relative w-full rounded-3xl bg-[#A4BAA2]/35 dark:bg-[#101c16]/80 backdrop-blur-2xl border border-white/80 dark:border-[#718D76]/30 shadow-[0_10px_35px_rgba(36,51,41,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-colors">
          <div className="relative flex items-center justify-center overflow-visible py-6 select-none" style={{ height: 240, perspective: '1100px', transformStyle: 'preserve-3d' }}>
            {visiblePlaceholders.map(({ key, relPos, isCenter }) => {
              const transform = get3DTransform(relPos);
              return (
                <div
                  key={key}
                  className="absolute will-change-transform pointer-events-none"
                  style={{
                    left: 'calc(50% - 82.5px)',
                    transform: `translateX(${transform.translateX}px) translateZ(${transform.translateZ}px) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
                    opacity: transform.opacity,
                    filter: `brightness(${transform.brightness})`,
                    transformStyle: 'preserve-3d',
                    zIndex: transform.zIndex,
                  }}
                >
                  <PlaceholderCard isCenter={isCenter} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (participants.length === 1) {
    const p = participants[0];
    const minCard = Math.floor(currentOffset - 4);
    const maxCard = Math.ceil(currentOffset + 4);
    const visibleCards = [];

    for (let i = minCard; i <= maxCard; i++) {
      const relPos = i - currentOffset;
      if (Math.abs(relPos) > 3.8) continue;
      const isPlayerCard = ((i % 4) + 4) % 4 === 0;
      visibleCards.push({
        key: `single-${i}`,
        relPos,
        isPlayer: isPlayerCard,
        isCenter: Math.abs(relPos) < 0.45,
      });
    }

    return (
      <div className="relative w-full my-4 overflow-visible">
        <CarouselIndicatorPin isSpinning={false} />
        <div className="relative w-full rounded-3xl bg-[#A4BAA2]/35 dark:bg-[#101c16]/80 backdrop-blur-2xl border border-white/80 dark:border-[#718D76]/30 shadow-[0_10px_35px_rgba(36,51,41,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-colors">
          <div className="relative flex items-center justify-center overflow-visible py-6 select-none" style={{ height: 240, perspective: '1100px', transformStyle: 'preserve-3d' }}>
            {visibleCards.map(({ key, relPos, isPlayer, isCenter }) => {
              const transform = get3DTransform(relPos);
              return (
                <div
                  key={key}
                  className="absolute will-change-transform pointer-events-none"
                  style={{
                    left: 'calc(50% - 82.5px)',
                    transform: `translateX(${transform.translateX}px) translateZ(${transform.translateZ}px) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
                    opacity: transform.opacity,
                    filter: `brightness(${transform.brightness})`,
                    transformStyle: 'preserve-3d',
                    zIndex: transform.zIndex,
                  }}
                >
                  {isPlayer ? (
                    <ParticipantCard participant={p} isCenter={isCenter} isWinner={false} />
                  ) : (
                    <PlaceholderCard isCenter={isCenter} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const minCard = Math.floor(currentOffset - 4);
  const maxCard = Math.ceil(currentOffset + 4);
  const visibleCards = [];

  for (let i = minCard; i <= maxCard; i++) {
    const relPos = i - currentOffset;
    if (Math.abs(relPos) > 3.8) continue;

    const pIndex = ((i % reelLen) + reelLen) % reelLen;
    const participant = cardReel[pIndex];
    const norm = (s?: string) => (s || '').toLowerCase().trim();
    const isWinnerCard =
      hasLandedWinner &&
      (norm(winner?.playerId) === norm(participant.playerId) ||
        norm(winner?.walletAddress) === norm(participant.walletAddress)) &&
      Math.abs(relPos) < 0.35;

    visibleCards.push({
      key: `card-${i}`,
      participant,
      relPos,
      isWinnerCard,
    });
  }

  return (
    <div className="relative w-full my-4 overflow-visible">
      <CarouselIndicatorPin isSpinning={isSpinning} />
      <div
        className={`relative w-full rounded-3xl backdrop-blur-2xl border transition-all duration-700 overflow-hidden ${
          isDarkening || isSpinning
            ? 'bg-[#040906]/95 dark:bg-[#020503]/98 border-2 border-emerald-400/90 shadow-[0_0_60px_rgba(16,185,129,0.35),inset_0_0_80px_rgba(0,0,0,0.95)]'
            : 'bg-[#A4BAA2]/35 dark:bg-[#101c16]/80 border-white/80 dark:border-[#718D76]/30 shadow-[0_10px_35px_rgba(36,51,41,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)]'
        }`}
      >
        {/* Ambient Darkened Spotlight & Theater Vignette */}
        {(isDarkening || isSpinning) && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {/* Top Center Spotlight Cone */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-80 bg-gradient-to-b from-emerald-400/30 via-emerald-400/10 to-transparent rounded-full blur-2xl animate-pulse" />
            {/* Cinematic Outer Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)]" />
          </div>
        )}

        <div
          className="relative flex items-center justify-center overflow-visible py-6 select-none"
          style={{ height: 240, perspective: '1100px', perspectiveOrigin: '50% 50%', transformStyle: 'preserve-3d' }}
        >
          {visibleCards.map(({ key, participant, relPos, isWinnerCard }) => {
            const transform = get3DTransform(relPos);
            const isNearCenter = Math.abs(relPos) < 0.45;

            return (
              <div
                key={key}
                className="absolute will-change-transform pointer-events-none"
                style={{
                  left: 'calc(50% - 82.5px)',
                  transform: `translateX(${transform.translateX}px) translateZ(${transform.translateZ}px) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
                  opacity: transform.opacity,
                  filter: `brightness(${transform.brightness})`,
                  transformStyle: 'preserve-3d',
                  zIndex: transform.zIndex,
                }}
              >
                <ParticipantCard
                  participant={participant}
                  isCenter={isNearCenter}
                  isWinner={isWinnerCard}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 3D Dual-Layer Beveled Indicator Pin (Like Uploaded Screenshot)
// ─────────────────────────────────────────────
interface CarouselIndicatorPinProps {
  isSpinning?: boolean;
}

const CarouselIndicatorPin: React.FC<CarouselIndicatorPinProps> = ({ isSpinning = false }) => {
  return (
    <div
      style={{ left: 'calc(50% - 6px)' }}
      className={`absolute -top-4 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none ${
        isSpinning
          ? 'animate-[bounce_0.22s_infinite]'
          : 'animate-[bounce_1.8s_ease-in-out_infinite]'
      }`}
    >
      {/* Radiant ambient sage glow halo */}
      <div className="absolute -inset-1.5 bg-[#718D76]/35 dark:bg-emerald-400/25 rounded-full blur-md animate-pulse pointer-events-none" />

      <div className="relative filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]">
        <svg
          width="34"
          height="30"
          viewBox="0 0 36 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Outer Bezel Gradients */}
            <linearGradient id="outerBezelGrad" x1="18" y1="0" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3d473e" />
              <stop offset="35%" stopColor="#252c26" />
              <stop offset="100%" stopColor="#141815" />
            </linearGradient>

            <linearGradient id="outerBezelStroke" x1="18" y1="0" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.65)" />
              <stop offset="45%" stopColor="rgba(255, 255, 255, 0.2)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.7)" />
            </linearGradient>

            {/* Inner Glowing Jewel Gradients (PONSPOT Mint/Sage/Emerald Crystal) */}
            <linearGradient id="innerJewelGrad" x1="18" y1="6" x2="18" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A2DFB0" />
              <stop offset="45%" stopColor="#718D76" />
              <stop offset="100%" stopColor="#35533C" />
            </linearGradient>

            <linearGradient id="innerJewelSheen" x1="18" y1="6" x2="18" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.95)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </linearGradient>
          </defs>

          {/* 1. Outer Dark Rounded Triangle Bezel */}
          <path
            d="M 5,3 L 31,3 Q 35,3 33,7 L 20,27.5 Q 18,30.5 16,27.5 L 3,7 Q 1,3 5,3 Z"
            fill="url(#outerBezelGrad)"
            stroke="url(#outerBezelStroke)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* 2. Inner Bevel Inset Shadow Line */}
          <path
            d="M 8.5,6 L 27.5,6 Q 29.5,6 28.5,8 L 19.5,22.5 Q 18,25 16.5,22.5 L 7.5,8 Q 6.5,6 8.5,6 Z"
            fill="#0E1210"
            opacity="0.75"
          />

          {/* 3. Inner Glowing Neon Mint / Sage Jewel */}
          <path
            d="M 9.5,7 L 26.5,7 Q 28.5,7 27.5,9 L 19.3,21.8 Q 18,23.8 16.7,21.8 L 8.5,9 Q 7.5,7 9.5,7 Z"
            fill="url(#innerJewelGrad)"
            stroke="rgba(195, 240, 205, 0.85)"
            strokeWidth="0.8"
            strokeLinejoin="round"
            className="animate-pulse"
          />

          {/* 4. Specular Top Sheen Highlight on Jewel */}
          <path
            d="M 10,7.5 L 26,7.5 Q 27.5,7.5 26.8,9 L 18,17 L 9.2,9 Q 8.5,7.5 10,7.5 Z"
            fill="url(#innerJewelSheen)"
            opacity="0.75"
          />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Ultra-Glossy Glassmorphic Participant Card (Liquid Glass & Specular Sheen)
// ─────────────────────────────────────────────
interface ParticipantCardProps {
  participant: PotParticipant;
  isCenter: boolean;
  isWinner: boolean;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant: p,
  isCenter,
  isWinner,
}) => {
  return (
    <div
      style={{ width: 165 }}
      className={`relative flex flex-col items-center gap-3 py-5 px-4 rounded-3xl transition-all duration-150 backdrop-blur-2xl overflow-hidden ${
        isWinner
          ? 'bg-gradient-to-b from-white/95 to-[#C3D5C1]/90 dark:from-[#1f3e2e]/95 dark:to-[#0a1610]/95 border-2 border-[#718D76] dark:border-emerald-400 shadow-[0_16px_36px_rgba(0,0,0,0.3),0_0_30px_rgba(113,141,118,0.45),inset_0_2px_1.5px_rgba(255,255,255,1)] text-[#243329] dark:text-[#F5F8F3]'
          : isCenter
          ? 'bg-white/90 dark:bg-[#162a20]/90 border-2 border-[#718D76] dark:border-emerald-400 shadow-[0_16px_36px_rgba(36,51,41,0.14),0_0_20px_rgba(113,141,118,0.25),inset_0_2px_1.5px_rgba(255,255,255,1)] text-[#243329] dark:text-[#F5F8F3]'
          : 'bg-white/70 dark:bg-[#101e17]/80 border border-white/90 dark:border-[#718D76]/30 shadow-[0_8px_24px_rgba(36,51,41,0.06),inset_0_1.5px_1px_rgba(255,255,255,0.9)] text-[#243329] dark:text-[#F5F8F3]'
      }`}
    >
      {/* ── 1. ULTRA-GLOSSY CURVED SPECULAR SHEEN OVERLAY (Like Logo Icon) ── */}
      <div className="absolute inset-x-0 top-0 h-[46%] rounded-t-3xl bg-gradient-to-b from-white/80 via-white/20 to-transparent pointer-events-none z-10" />

      {/* Top ambient sage light beacon for center card */}
      {isCenter && !isWinner && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-16 h-[3px] bg-gradient-to-r from-transparent via-[#718D76] dark:via-emerald-400 to-transparent rounded-full shadow-[0_0_10px_#718D76] z-20" />
      )}
      {isWinner && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-[#718D76] dark:via-emerald-400 to-transparent rounded-full shadow-[0_0_14px_#718D76] z-20" />
      )}

      {/* ── 2. GLOSSY AVATAR GLASS POD ── */}
      <div className={`relative p-1 rounded-2xl bg-white/85 dark:bg-white/10 border border-white/90 dark:border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_12px_rgba(36,51,41,0.08)] backdrop-blur-md overflow-hidden z-20 ${isCenter ? 'ring-2 ring-[#718D76]/70 dark:ring-emerald-400/70' : ''}`}>
        <div className="absolute inset-x-0 top-0 h-[48%] rounded-t-xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />
        
        <img
          src={p.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerId}`}
          alt={p.playerName}
          className="w-20 h-20 object-cover rounded-xl shadow-inner relative z-0"
          draggable={false}
        />
        {isWinner && (
          <div className="absolute inset-0 bg-[#718D76]/25 dark:bg-emerald-400/25 rounded-xl flex items-center justify-center animate-pulse z-20">
            <span className="text-2xl drop-shadow-[0_0_8px_#718D76]">👑</span>
          </div>
        )}
      </div>

      {/* ── 3. PLAYER NAME ── */}
      <p
        className={`text-xs font-black truncate w-full text-center tracking-tight leading-tight z-20 ${
          isWinner ? 'text-[#718D76] dark:text-emerald-300' : isCenter ? 'text-[#243329] dark:text-white font-extrabold' : 'text-[#243329]/80 dark:text-slate-200'
        }`}
      >
        {p.playerName.length > 14 ? p.playerName.slice(0, 13) + '…' : p.playerName}
      </p>

      {/* ── 4. GLOSSY CRYSTAL TOKEN WAGER CAPSULE ── */}
      <div className="relative flex items-center gap-1.5 px-4 py-1.5 bg-white/85 dark:bg-[#1d3829] border border-white/95 dark:border-[#718D76]/45 rounded-full shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_6px_rgba(36,51,41,0.08)] z-20 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[45%] rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />

        <img
          src="/image/logo.png"
          alt="PONSPOT"
          className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0 shadow-sm"
        />
        <span className={`text-[11px] font-black tabular-nums tracking-wide ${isWinner ? 'text-[#718D76] dark:text-emerald-300' : isCenter ? 'text-[#243329] dark:text-white' : 'text-[#243329]/80 dark:text-slate-200'}`}>
          {p.totalSpent >= 1000 ? `${(p.totalSpent / 1000).toFixed(1)}k` : p.totalSpent} PONSPOT
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Waiting placeholder card (Harmonious Mint Sage Glass)
// ─────────────────────────────────────────────
interface PlaceholderCardProps {
  isCenter?: boolean;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ isCenter = false }) => (
  <div
    style={{ width: 165 }}
    className={`relative flex flex-col items-center gap-3 py-5 px-4 rounded-3xl backdrop-blur-2xl select-none transition-all duration-150 overflow-hidden ${
      isCenter
        ? 'bg-white/90 dark:bg-[#162a20]/90 border-2 border-[#718D76] dark:border-emerald-400 shadow-[0_16px_36px_rgba(36,51,41,0.14),0_0_20px_rgba(113,141,118,0.25),inset_0_2px_1.5px_rgba(255,255,255,1)] ring-2 ring-[#718D76]/40 dark:ring-emerald-400/40'
        : 'bg-white/70 dark:bg-[#101e17]/80 border border-white/90 dark:border-[#718D76]/30 shadow-[0_8px_24px_rgba(36,51,41,0.06),inset_0_1.5px_1px_rgba(255,255,255,0.9)]'
    }`}
  >
    {/* Specular Curved Gloss Sheen Overlay */}
    <div className="absolute inset-x-0 top-0 h-[46%] rounded-t-3xl bg-gradient-to-b from-white/80 via-white/20 to-transparent pointer-events-none z-10" />

    {/* Top ambient sage beacon for center waiting card */}
    {isCenter && (
      <div className="absolute -top-px left-1/2 -translate-x-1/2 w-16 h-[3px] bg-gradient-to-r from-transparent via-[#718D76] dark:via-emerald-400 to-transparent rounded-full shadow-[0_0_10px_#718D76] z-20" />
    )}

    {/* Glossy Avatar Bubble with breathing pulse */}
    <div className={`relative w-22 h-22 p-1 rounded-2xl bg-white/85 dark:bg-white/10 border border-white/90 dark:border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_4px_10px_rgba(36,51,41,0.06)] flex items-center justify-center overflow-hidden z-20 ${isCenter ? 'ring-2 ring-[#718D76]/70 dark:ring-emerald-400/70' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-[48%] rounded-t-xl bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
      <div className="w-20 h-20 rounded-xl bg-[#E6EFE4] dark:bg-[#0c1611]/80 flex items-center justify-center shadow-inner relative overflow-hidden">
        {/* Soft radar pulse sweep */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#718D76]/15 dark:from-emerald-400/15 to-transparent animate-pulse" />
        <span className="text-[#718D76] dark:text-emerald-400 text-3xl font-black drop-shadow-sm animate-pulse relative z-10">?</span>
      </div>
    </div>

    {/* Animated Waiting Label with Animated Dots */}
    <p className="text-xs font-black text-[#243329] dark:text-white z-20 flex items-center gap-0.5">
      <span>Waiting</span>
      <span className="inline-flex tracking-tighter">
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '300ms' }}>.</span>
      </span>
    </p>

    {/* Glossy Token Capsule */}
    <div className="relative flex items-center gap-1.5 px-4 py-1.5 bg-white/85 dark:bg-[#0c1611]/80 border border-white/95 dark:border-[#718D76]/35 rounded-full shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_6px_rgba(36,51,41,0.06)] z-20 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[45%] rounded-t-full bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
      <span className="text-[#718D76] dark:text-emerald-400 text-[8px] font-black">PONSPOT</span>
      <span className="text-xs font-black text-[#243329] dark:text-white tabular-nums">0</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Right Winner History Sidebar (Trading Dashboard Aesthetics)
// ─────────────────────────────────────────────
interface RightWinnerSidebarProps {
  pastRounds: PastRound[];
}

export const RightWinnerSidebar: React.FC<RightWinnerSidebarProps> = ({ pastRounds }) => {
  const badges = ['LAST WINNER', 'LUCK OF THE DAY', 'HIGH ROROLLER', 'HOT STREAK', 'BIG WIN', 'LUCKY'];
  const badgeColors = [
    'bg-[#718D76]/15 dark:bg-[#718D76]/30 text-[#243329] dark:text-emerald-300 border border-[#718D76]/30',
    'bg-emerald-600/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30',
    'bg-[#5E7A63]/15 dark:bg-[#5E7A63]/30 text-[#243329] dark:text-emerald-300 border border-[#5E7A63]/30',
    'bg-[#718D76]/20 dark:bg-[#718D76]/35 text-[#243329] dark:text-emerald-300 border border-[#718D76]/30',
    'bg-amber-600/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-600/30',
    'bg-teal-600/15 dark:bg-teal-500/25 text-teal-800 dark:text-teal-300 border border-teal-600/30',
  ];

  return (
    <aside className="w-full lg:w-[275px] flex-shrink-0 flex flex-col bg-[#A4BAA2]/75 dark:bg-[#0e1914]/85 backdrop-blur-2xl border-l border-white/60 dark:border-[#718D76]/30 h-full overflow-y-auto transition-colors">
      {/* Last Winners Header */}
      <div className="m-3 p-3 rounded-2xl bg-white/50 dark:bg-[#14241d]/70 border border-white/70 dark:border-[#718D76]/35 shadow-sm">
        <p className="text-[9px] text-[#718D76] dark:text-emerald-400 font-black tracking-wider flex items-center gap-1.5 uppercase">
          <span className="w-2 h-2 rounded-full bg-[#718D76] dark:bg-emerald-400 animate-pulse" />
          RECENT ROUNDS
        </p>
        <p className="text-sm font-black text-[#243329] dark:text-white tracking-wide mt-0.5">LAST WINNERS</p>
      </div>

      <div className="flex-1 px-3 pb-4 space-y-3">
        {pastRounds.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#526256] dark:text-slate-500 italic">No rounds yet</div>
        ) : (
          pastRounds.slice(0, 8).map((r, idx) => {
            const w = r.winner;
            return (
              <div
                key={r.roundNumber}
                className="bg-white/60 dark:bg-[#13231c]/70 hover:bg-white/80 dark:hover:bg-[#1a2e25] backdrop-blur-xl border border-white/80 dark:border-[#718D76]/30 rounded-2xl p-3.5 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#526256] dark:text-slate-400 uppercase tracking-wider">ROUND #{r.roundNumber}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badgeColors[idx % badgeColors.length]}`}>
                    {badges[idx % badges.length]}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-2.5">
                  <div className={`p-0.5 rounded-xl flex-shrink-0 ${idx === 0 ? 'ring-2 ring-[#718D76] dark:ring-emerald-400 shadow-[0_0_10px_rgba(113,141,118,0.4)]' : 'ring-1 ring-white/80 dark:ring-white/10'}`}>
                    <img
                      src={w.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${w.playerId}`}
                      alt={w.playerName}
                      className="w-10 h-10 rounded-lg bg-white/60 dark:bg-black/40 object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[#243329] dark:text-white truncate">{w.playerName}</p>
                    <p className="text-[10px] font-mono text-[#718D76] dark:text-emerald-400 font-bold">{w.odds}% Chance</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/50 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-[#526256] dark:text-slate-400 font-bold">Total Pot Won</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono font-black text-[#243329] dark:text-emerald-300">{r.totalPot.toLocaleString()}</span>
                    <span className="text-[10px] text-[#718D76] dark:text-emerald-400 font-black">PONSPOT</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

