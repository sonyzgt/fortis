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
        className={`relative w-full rounded-2xl transition-all duration-500 overflow-hidden ${
          isDarkening || isSpinning
            ? 'bg-[#030611]/98 border-2 border-[#00f0ff] shadow-[0_0_50px_rgba(0,240,255,0.4),inset_0_0_60px_rgba(0,0,0,0.95)]'
            : 'bg-[#0a1020]/90 border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(0,240,255,0.2)]'
        }`}
      >
        {/* Cyberpunk Top & Bottom Tech Accents */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-75 z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff007a] to-transparent opacity-60 z-20 pointer-events-none" />

        {/* Ambient Laser Grid Spotlight */}
        {(isDarkening || isSpinning) && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-cyan-400/35 via-cyan-500/10 to-transparent rounded-full blur-2xl animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(3,6,17,0.92)_100%)]" />
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
// Cyberpunk Holographic Targeting Reticle Pin
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
          ? 'animate-[bounce_0.18s_infinite]'
          : 'animate-[bounce_2s_ease-in-out_infinite]'
      }`}
    >
      {/* Radiant ambient neon cyan halo */}
      <div className="absolute -inset-2 bg-[#00f0ff]/40 rounded-full blur-lg animate-pulse pointer-events-none" />

      <div className="relative filter drop-shadow-[0_0_12px_rgba(0,240,255,0.9)]">
        <svg
          width="36"
          height="32"
          viewBox="0 0 36 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cyberNeedleBezel" x1="18" y1="0" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0c182e" />
              <stop offset="40%" stopColor="#070e1c" />
              <stop offset="100%" stopColor="#02060f" />
            </linearGradient>

            <linearGradient id="cyberNeonLaser" x1="18" y1="4" x2="18" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#26f4ff" />
              <stop offset="50%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#007799" />
            </linearGradient>
          </defs>

          {/* Outer Cyber Bezel */}
          <path
            d="M 5,3 L 31,3 Q 35,3 33,7 L 20,27.5 Q 18,30.5 16,27.5 L 3,7 Q 1,3 5,3 Z"
            fill="url(#cyberNeedleBezel)"
            stroke="#00f0ff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Inner Glowing Laser Core */}
          <path
            d="M 9,6.5 L 27,6.5 Q 28.5,6.5 27.5,8.5 L 19.3,22 Q 18,24 16.7,22 L 8.5,8.5 Q 7.5,6.5 9,6.5 Z"
            fill="url(#cyberNeonLaser)"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeLinejoin="round"
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Cyberpunk Holographic Participant Card
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
      className={`relative flex flex-col items-center gap-2.5 py-4 px-3.5 rounded-2xl transition-all duration-150 backdrop-blur-2xl overflow-hidden ${
        isWinner
          ? 'bg-gradient-to-b from-[#0a2033] to-[#040c17] border-2 border-[#00ff88] shadow-[0_0_35px_rgba(0,255,136,0.6),inset_0_1px_2px_rgba(0,255,136,0.4)] text-white'
          : isCenter
          ? 'bg-gradient-to-b from-[#0f1d38] to-[#080f1e] border-2 border-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.45),inset_0_1px_2px_rgba(0,240,255,0.3)] text-white'
          : 'bg-[#0c1424]/90 border border-cyan-500/25 shadow-[0_8px_25px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] text-slate-200'
      }`}
    >
      {/* Top Cyber Specular Highlight */}
      <div className="absolute inset-x-0 top-0 h-[40%] rounded-t-2xl bg-gradient-to-b from-cyan-400/20 to-transparent pointer-events-none z-10" />

      {/* Cyber Center Laser Beacons */}
      {isCenter && !isWinner && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#00f0ff] shadow-[0_0_12px_#00f0ff] z-20" />
      )}
      {isWinner && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-20 h-[3px] bg-[#00ff88] shadow-[0_0_16px_#00ff88] z-20" />
      )}

      {/* Holographic Avatar Pod with Cyber Frame */}
      <div className={`relative p-1 rounded-xl bg-black/60 border ${isWinner ? 'border-[#00ff88]' : isCenter ? 'border-[#00f0ff]' : 'border-cyan-500/30'} shadow-[inset_0_0_10px_rgba(0,240,255,0.2)] overflow-hidden z-20`}>
        <img
          src={p.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerId}`}
          alt={p.playerName}
          className="w-20 h-20 object-cover rounded-lg shadow-inner relative z-0"
          draggable={false}
        />
        {isWinner && (
          <div className="absolute inset-0 bg-[#00ff88]/20 rounded-lg flex items-center justify-center animate-pulse z-20">
            <span className="text-2xl drop-shadow-[0_0_10px_#00ff88]">👑</span>
          </div>
        )}
      </div>

      {/* Player Name */}
      <p
        className={`text-xs font-black truncate w-full text-center tracking-wide z-20 font-cyber ${
          isWinner ? 'text-[#00ff88]' : isCenter ? 'text-[#00f0ff]' : 'text-slate-200'
        }`}
      >
        {p.playerName.length > 14 ? p.playerName.slice(0, 13) + '…' : p.playerName}
      </p>

      {/* Token Wager Pill with Cyber Odds */}
      <div className={`relative flex items-center justify-between w-full px-2.5 py-1 bg-black/50 border ${isWinner ? 'border-[#00ff88]/50 text-[#00ff88]' : isCenter ? 'border-cyan-400/50 text-[#00f0ff]' : 'border-cyan-500/20 text-slate-300'} rounded-lg z-20 font-mono text-[10px]`}>
        <span className="font-bold">{p.odds}%</span>
        <span className="font-black tabular-nums">{p.totalSpent >= 1000 ? `${(p.totalSpent / 1000).toFixed(0)}k` : p.totalSpent} PONS</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Cyber Waiting Placeholder Card
// ─────────────────────────────────────────────
interface PlaceholderCardProps {
  isCenter?: boolean;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ isCenter = false }) => (
  <div
    style={{ width: 165 }}
    className={`relative flex flex-col items-center gap-3 py-5 px-4 rounded-2xl backdrop-blur-2xl select-none transition-all duration-150 overflow-hidden ${
      isCenter
        ? 'bg-gradient-to-b from-[#0e1b36] to-[#070e1e] border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.35)]'
        : 'bg-[#0c1424]/80 border border-cyan-500/25'
    }`}
  >
    {/* Cyber Avatar Pod */}
    <div className={`relative w-22 h-22 p-1 rounded-xl bg-black/60 border ${isCenter ? 'border-cyan-400' : 'border-cyan-500/30'} flex items-center justify-center overflow-hidden z-20`}>
      <div className="w-20 h-20 rounded-lg bg-[#050b17] flex items-center justify-center shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent animate-pulse" />
        <span className="text-[#00f0ff] text-2xl font-black font-orbitron drop-shadow-[0_0_8px_#00f0ff] animate-pulse relative z-10">?</span>
      </div>
    </div>

    {/* Waiting Label with Animated Dots */}
    <p className="text-xs font-black text-cyan-300 z-20 flex items-center gap-0.5 font-cyber uppercase tracking-wider">
      <span>WAITING</span>
      <span className="inline-flex tracking-tighter text-[#00f0ff]">
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDuration: '1s', animationDelay: '300ms' }}>.</span>
      </span>
    </p>

    {/* Capsule */}
    <div className="relative flex items-center justify-between w-full px-2.5 py-1 bg-black/50 border border-cyan-500/20 rounded-lg z-20 font-mono text-[10px] text-slate-400">
      <span className="text-cyan-400 font-bold">POT</span>
      <span className="text-white font-black">0 PONS</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Right Winner History Sidebar (Cyberpunk Terminal Stream)
// ─────────────────────────────────────────────
interface RightWinnerSidebarProps {
  pastRounds: PastRound[];
}

export const RightWinnerSidebar: React.FC<RightWinnerSidebarProps> = ({ pastRounds }) => {
  const badges = ['LAST WINNER', 'TOP ROLLER', 'STREAK', 'BIG WIN', 'JACKPOT', 'LUCKY'];
  const badgeColors = [
    'bg-cyan-950/60 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_8px_rgba(0,240,255,0.25)]',
    'bg-emerald-950/60 text-[#00ff88] border border-emerald-400/40 shadow-[0_0_8px_rgba(0,255,136,0.25)]',
    'bg-purple-950/60 text-[#c084fc] border border-purple-400/40 shadow-[0_0_8px_rgba(192,132,252,0.25)]',
    'bg-pink-950/60 text-[#ff007a] border border-pink-400/40 shadow-[0_0_8px_rgba(255,0,122,0.25)]',
    'bg-amber-950/60 text-[#facc15] border border-amber-400/40 shadow-[0_0_8px_rgba(250,204,21,0.25)]',
    'bg-teal-950/60 text-[#2dd4bf] border border-teal-400/40 shadow-[0_0_8px_rgba(45,212,191,0.25)]',
  ];

  return (
    <aside className="w-full lg:w-[285px] flex-shrink-0 flex flex-col bg-[#060b17]/95 backdrop-blur-2xl border-l border-cyan-500/20 h-full overflow-y-auto transition-colors">
      {/* Cyber Header */}
      <div className="m-3 p-3 rounded-xl bg-[#091224] border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#00f0ff] font-bold tracking-widest flex items-center gap-1.5 uppercase font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
            TELEMETRY // FEED
          </p>
          <span className="text-[9px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">LIVE</span>
        </div>
        <p className="text-xs font-black text-white tracking-wider mt-1 font-orbitron">RECENT WINNERS</p>
      </div>

      <div className="flex-1 px-3 pb-4 space-y-2.5">
        {pastRounds.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 italic font-mono">NO DATA STREAM // WAITING ROUNDS</div>
        ) : (
          pastRounds.slice(0, 8).map((r, idx) => {
            const w = r.winner;
            return (
              <div
                key={r.roundNumber}
                className="bg-[#091224]/80 hover:bg-[#0e1a33] backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/50 rounded-xl p-3 transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">ROUND #{r.roundNumber}</span>
                  <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded ${badgeColors[idx % badgeColors.length]}`}>
                    {badges[idx % badges.length]}
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`p-0.5 rounded-lg flex-shrink-0 ${idx === 0 ? 'ring-2 ring-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'ring-1 ring-white/10'}`}>
                    <img
                      src={w.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${w.playerId}`}
                      alt={w.playerName}
                      className="w-9 h-9 rounded-md bg-black/60 object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-white truncate font-cyber">{w.playerName}</p>
                    <p className="text-[10px] font-mono text-cyan-400 font-bold">{w.odds}% Chance</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono">
                  <span className="text-[9px] text-slate-400 uppercase">Pot Won</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-[#00ff88]">{r.totalPot.toLocaleString()}</span>
                    <span className="text-[9px] text-cyan-400 font-bold">PONS</span>
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

