'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PotParticipant, PastRound, WinnerInfo } from '@/types/jackpot';
import { useSound } from '@/context/SoundContext';
import { BookplateCorner } from '@/components/ui/CelestialFlourish';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

interface PlayerCarouselProps {
  participants: PotParticipant[];
  isSpinning?: boolean;
  winner?: WinnerInfo | null;
}

// ─────────────────────────────────────────────
// Build reel of cards proportional to tickets
// ─────────────────────────────────────────────
function buildCardReel(participants: PotParticipant[] = []): PotParticipant[] {
  if (!participants || !Array.isArray(participants) || participants.length === 0) return [];
  
  const targetSize = 60;
  if (participants.length === 1) {
    return Array(targetSize).fill(participants[0]);
  }

  const totalTickets = participants.reduce((sum, p) => sum + p.ticketCount, 0);
  if (totalTickets <= 0) {
    const reel: PotParticipant[] = [];
    while (reel.length < targetSize) {
      for (const p of participants) {
        reel.push(p);
        if (reel.length >= targetSize) break;
      }
    }
    return reel;
  }

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

// Continuous 3D perspective mapping function (Astrolabe cylindrical curve)
function get3DTransform(p: number) {
  const absP = Math.abs(p);

  const R = 860;
  const angleStep = 0.225;
  const theta = p * angleStep;

  const translateX = Math.sin(theta) * R;
  const translateZ = (Math.cos(theta) - 1) * R - (absP * 3);
  const rotateY = (theta * 180) / Math.PI * 0.7;
  const scale = Math.max(0.88, 1.02 - absP * 0.035);

  let opacity = 1.0;
  if (absP <= 3.4) {
    opacity = 1.0;
  } else {
    opacity = Math.max(0, 0.8 - (absP - 3.4) * 0.9);
  }

  const brightness = Math.max(0.92, 1.0 - absP * 0.02);
  const zIndex = Math.round(100 - absP * 10);

  return { translateX, translateZ, rotateY, scale, opacity, brightness, zIndex };
}

export const PlayerCarousel: React.FC<PlayerCarouselProps> = ({
  participants = [],
  isSpinning,
  winner,
}) => {
  const { playTick, playSuspenseRiser, playRollStart, playWin, pauseBgm, resumeBgm } = useSound();

  const cardReel = useMemo(() => buildCardReel(participants), [participants]);
  const reelLen = cardReel.length;

  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTickCardRef = useRef(0);

  const isDeceleratingRef = useRef(false);
  const spinStartOffsetRef = useRef(0);
  const spinTargetOffsetRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const spinDurationRef = useRef(9200);

  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasLandedWinner, setHasLandedWinner] = useState(false);
  const [isDarkening, setIsDarkening] = useState(false);

  const spinInitiatedRef = useRef(false);

  useEffect(() => {
    if (isSpinning && reelLen > 0) {
      if (spinInitiatedRef.current) {
        return; // Already spinning this round
      }
      spinInitiatedRef.current = true;
      setHasLandedWinner(false);
      setIsDarkening(true);

      // Audio effects
      pauseBgm();
      playSuspenseRiser();
      playRollStart();

      const norm = (str?: string) => (str || '').toLowerCase().trim();
      const winnerId = norm(winner?.playerId || winner?.walletAddress);

      let winnerIndices = cardReel
        .map((p, idx) =>
          norm(p.playerId) === winnerId || norm(p.walletAddress) === winnerId ? idx : -1
        )
        .filter((idx) => idx !== -1);

      if (winnerIndices.length === 0) {
        winnerIndices = [0];
      }

      const startOffset = offsetRef.current;
      spinStartOffsetRef.current = startOffset;
      const duration = 10000; // Exactly 10.0s realistic physics slow-mo deceleration
      spinDurationRef.current = duration;

      // High-speed start through 45-75 cards
      const minShifts = Math.max(45, Math.min(reelLen * 3.5, 75));
      let finalTarget = Math.ceil(startOffset + minShifts);
      const remainder = ((finalTarget % reelLen) + reelLen) % reelLen;
      const targetRemainder = winnerIndices[0];
      let diff = targetRemainder - remainder;
      if (diff < 0) diff += reelLen;
      finalTarget += diff;

      if (finalTarget - startOffset < 30) {
        finalTarget += reelLen;
      }

      spinTargetOffsetRef.current = finalTarget;
      spinStartTimeRef.current = performance.now();
      isDeceleratingRef.current = true;
    } else if (!isSpinning) {
      spinInitiatedRef.current = false;
      // If the spin animation is still completing its natural slow-mo crawl,
      // do NOT abruptly cancel it or jump! Let it finish to progress >= 1.
      if (!isDeceleratingRef.current) {
        setIsDarkening(false);
      }
    }
  }, [isSpinning, winner?.playerId, winner?.walletAddress, reelLen, pauseBgm, playSuspenseRiser, playRollStart]);

  useEffect(() => {
    const animate = (now: number) => {
      if (isDeceleratingRef.current) {
        const elapsed = now - spinStartTimeRef.current;
        const duration = spinDurationRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

        // Physics-inspired gradual slow-mo deceleration curve:
        // Fast blur spin across 0s-3s, visible deceleration across 3s-7s,
        // and dramatic slow-motion crawl across 7s-10s with rhythmic card ticks.
        const oneMinusP = 1 - progress;
        const eased = 1 - (Math.pow(oneMinusP, 2.5) * 0.75 + Math.pow(oneMinusP, 1.5) * 0.25);

        const totalDist = spinTargetOffsetRef.current - spinStartOffsetRef.current;
        offsetRef.current = spinStartOffsetRef.current + totalDist * eased;

        // Instantaneous card velocity for tick sounds:
        const currentSpeed = (totalDist / 10) * (1.875 * Math.pow(oneMinusP, 1.5) + 0.375 * Math.pow(oneMinusP, 0.5));

        const currentCenterCard = Math.floor(offsetRef.current + 0.5);
        if (currentCenterCard !== lastTickCardRef.current) {
          lastTickCardRef.current = currentCenterCard;
          if (currentSpeed < 16 && currentSpeed > 0.03) {
            playTick();
          }
        }

        if (progress >= 1) {
          offsetRef.current = spinTargetOffsetRef.current;
          isDeceleratingRef.current = false;
          setIsDarkening(false);
          setHasLandedWinner(true);
          playWin();
          setTimeout(() => {
            resumeBgm();
          }, 2500);
        }
        setCurrentOffset(offsetRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playTick, playWin, resumeBgm]);

  // Viewport Container Wrapper
  const renderViewport = (children: React.ReactNode) => (
    <div className="relative w-full my-6 overflow-visible">
      {/* Precision Hairline Target Indicator */}
      <CarouselIndicatorPin isSpinning={isSpinning} />

      {/* Liquid Glass Facility Chamber */}
      <div
        className={`relative w-full glass-capsule transition-all duration-700 overflow-hidden border border-white/10 rounded-3xl ${
          isDarkening || isSpinning
            ? 'shadow-[0_20px_60px_rgba(205, 180, 134,0.25)] border-[#00E701]/50'
            : 'shadow-[0_16px_40px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Subtle Convergence Glow during spin */}
        {(isDarkening || isSpinning) && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-[#00E701]/25 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,5,8,0.9)_100%)]" />
          </div>
        )}

        {/* Card Stage with 3D perspective */}
        <div
          className="relative flex items-center justify-center overflow-visible py-7 select-none"
          style={{ height: 250, perspective: '1100px', perspectiveOrigin: '50% 50%', transformStyle: 'preserve-3d' }}
        >
          {children}
        </div>
      </div>
    </div>
  );

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

    return renderViewport(
      visiblePlaceholders.map(({ key, relPos, isCenter }) => {
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
      })
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
    if (!participant) continue;
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

  return renderViewport(
    visibleCards.map(({ key, participant, relPos, isWinnerCard }) => {
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
    })
  );
};

// ─────────────────────────────────────────────
// Cyber Cyan Arrow Target Indicator
// ─────────────────────────────────────────────
interface CarouselIndicatorPinProps {
  isSpinning?: boolean;
}

// ─────────────────────────────────────────────
// Glowing Liquid Glass Droplet Indicator
// ─────────────────────────────────────────────
interface CarouselIndicatorPinProps {
  isSpinning?: boolean;
}

const CarouselIndicatorPin: React.FC<CarouselIndicatorPinProps> = ({ isSpinning = false }) => {
  return (
    <div
      className={`absolute -top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none ${
        isSpinning ? 'animate-[bounce_0.2s_infinite]' : ''
      }`}
    >
      {/* Glowing Liquid Glass Droplet Indicator */}
      <div className="relative filter drop-shadow-[0_4px_16px_rgba(205, 180, 134,0.9)]">
        <div
          className="w-7 h-9 border border-white/60 flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 40% 30%, rgba(255, 255, 255, 0.95) 0%, rgba(205, 180, 134, 0.85) 45%, rgba(2, 132, 199, 0.95) 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 6px rgba(0, 0, 0, 0.5), 0 0 20px rgba(205, 180, 134, 0.7)',
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%)',
          }}
        >
          {/* Top Specular Arc */}
          <div className="absolute top-0.5 inset-x-1 h-2 rounded-full bg-white/80 blur-[0.5px]" />
          {/* Internal Caustic Core */}
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Liquid Glass Contender Bubble Card
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
  const cardClass = isWinner
    ? 'glass-slot-card-center border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.5)]'
    : isCenter
    ? 'glass-slot-card-center'
    : 'glass-slot-card opacity-75';

  return (
    <div
      style={{ width: 165 }}
      className={`relative flex flex-col items-center gap-3 py-5 px-3.5 select-none ${cardClass}`}
    >
      {/* Avatar in Rounded Glass Bubble */}
      <div
        className={`relative w-14 h-14 rounded-2xl p-0.5 border flex items-center justify-center overflow-hidden transition-transform ${
          isWinner
            ? 'border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] bg-amber-400/20'
            : isCenter
            ? 'border-[#00E701]/80 shadow-[0_0_15px_rgba(205, 180, 134,0.4)] bg-[#00E701]/10 scale-105'
            : 'border-white/15 bg-white/[0.03]'
        }`}
      >
        <img
          src={p.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerId}`}
          alt={p.playerName}
          className="w-full h-full object-cover rounded-xl"
          draggable={false}
        />
        {isWinner && (
          <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-[10px] font-sans font-black text-amber-200 tracking-wider">VICTOR</span>
          </div>
        )}
      </div>

      {/* Player Name */}
      <p className="text-xs font-sans font-bold tracking-tight truncate w-full text-center text-[#F5F7FA]">
        {p.playerName.length > 14 ? p.playerName.slice(0, 13) + '…' : p.playerName}
      </p>

      {/* Stake Badge as Glass Capsule */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-white/[0.04] text-[11px] font-mono tracking-wider font-bold shadow-inner">
        <span className="text-[#00E701]">
          {p.totalSpent >= 1000 ? `${(p.totalSpent / 1000).toFixed(1)}k` : p.totalSpent}
        </span>
        <span className="text-[9px] text-[#8993A4]">{TOKEN_SYMBOL}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Liquid Glass Placeholder Card
// ─────────────────────────────────────────────
interface PlaceholderCardProps {
  isCenter?: boolean;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ isCenter = false }) => (
  <div
    style={{ width: 165 }}
    className={`relative flex flex-col items-center gap-3 py-5 px-3.5 select-none transition-all duration-200 ${
      isCenter ? 'glass-slot-card-center' : 'glass-slot-card opacity-40'
    }`}
  >
    {/* Empty Glass Node */}
    <div className="w-14 h-14 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] flex items-center justify-center">
      <span className="text-white/30 font-mono text-xs font-bold">--</span>
    </div>

    {/* Label */}
    <p className="text-[10px] font-sans text-[#8993A4] uppercase tracking-wider">
      Awaiting Contender
    </p>

    {/* Stake Empty Glass Pill */}
    <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02] text-[10px] font-mono text-white/30">
      <span>—.— {TOKEN_SYMBOL}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Archives of Fortune (Right Winners Chronicle)
// ─────────────────────────────────────────────
export interface UnifiedVictoryItem {
  id: string;
  gameType: 'jackpot' | 'coinflip';
  label: string;
  winnerName: string;
  winnerAvatar?: string;
  winnerAddress?: string;
  detail: string;
  totalPot: number;
  timestamp: number;
  coinSide?: 'heads' | 'tails';
}

interface RightWinnerSidebarProps {
  pastRounds?: PastRound[];
  coinflipGames?: any[];
}

export const RightWinnerSidebar: React.FC<RightWinnerSidebarProps> = ({
  pastRounds = [],
  coinflipGames = [],
}) => {
  const [filterType, setFilterType] = useState<'all' | 'jackpot' | 'coinflip'>('all');

  const jackpotVictories = useMemo<UnifiedVictoryItem[]>(() => {
    return pastRounds.map((r) => ({
      id: `jp_${r.roundNumber}`,
      gameType: 'jackpot',
      label: `ORBIT #${r.roundNumber}`,
      winnerName: r.winner.playerName || 'Initiate',
      winnerAvatar: r.winner.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.winner.playerId}`,
      winnerAddress: r.winner.walletAddress,
      detail: `${r.winner.odds || 0}% Probability`,
      totalPot: r.totalPot,
      timestamp: r.timestamp || r.winner.timestamp || 0,
    }));
  }, [pastRounds]);

  const coinflipVictories = useMemo<UnifiedVictoryItem[]>(() => {
    return coinflipGames
      .filter((g) => g.status === 'complete' && g.winnerId)
      .map((g) => {
        const winningSide = g.result || (g.winnerId === g.creatorId ? g.creatorSide : (g.creatorSide === 'heads' ? 'tails' : 'heads'));
        return {
          id: g.id || `cf_${g.roomNumber}`,
          gameType: 'coinflip',
          label: `DUEL #CF-${g.roomNumber || (g.id?.replace('cf_', '').slice(0, 5)) || 'DUEL'}`,
          winnerName: g.winnerName || 'Duelist',
          winnerAvatar: (g.winnerId?.toLowerCase() === g.creatorId?.toLowerCase() ? g.creatorAvatar : g.challengerAvatar) || '/image/logo.png',
          winnerAddress: g.winnerId,
          detail: winningSide === 'heads' ? 'Head' : 'Tail',
          coinSide: winningSide,
          totalPot: g.winAmount || g.betAmount * 2,
          timestamp: g.claimedAt || g.createdAt || 0,
        };
      });
  }, [coinflipGames]);

  const displayedVictories = useMemo(() => {
    let list: UnifiedVictoryItem[] = [];
    if (filterType === 'all') {
      list = [...jackpotVictories, ...coinflipVictories];
    } else if (filterType === 'jackpot') {
      list = jackpotVictories;
    } else {
      list = coinflipVictories;
    }
    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }, [filterType, jackpotVictories, coinflipVictories]);

  const totalCount = jackpotVictories.length + coinflipVictories.length;

  return (
    <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col bg-[#030508]/80 border-l border-white/10 backdrop-blur-xl h-full overflow-y-auto select-none transition-colors">
      {/* Masthead */}
      <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl border border-white/20 p-1 bg-white/5 flex items-center justify-center flex-shrink-0 shadow-inner">
            <img src="/image/logo.png" alt="Fortis" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-sans font-bold tracking-wider text-[#F5F7FA] uppercase">
              ARCHIVES
            </h2>
            <p className="text-[10px] text-[#8993A4] font-sans">
              Historical Victories
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono tracking-wider text-[#00E701] border border-[#00E701]/30 px-2 py-0.5 rounded-full bg-[#00E701]/10">
          #{totalCount}
        </span>
      </div>

      {/* Filter Tabs: ALL / JACKPOT / COINFLIP */}
      <div className="flex items-center border-b border-white/10 bg-white/[0.01] p-1 gap-1 text-[11px] font-sans">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold tracking-wide uppercase transition-all cursor-pointer ${
            filterType === 'all'
              ? 'glass-pill-active text-xs py-1'
              : 'text-[#8993A4] hover:text-[#F5F7FA]'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilterType('jackpot')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold tracking-wide uppercase transition-all cursor-pointer ${
            filterType === 'jackpot'
              ? 'glass-pill-active text-xs py-1'
              : 'text-[#8993A4] hover:text-[#F5F7FA]'
          }`}
        >
          Jackpot
        </button>
        <button
          type="button"
          onClick={() => setFilterType('coinflip')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold tracking-wide uppercase transition-all cursor-pointer ${
            filterType === 'coinflip'
              ? 'glass-pill-active text-xs py-1'
              : 'text-[#8993A4] hover:text-[#F5F7FA]'
          }`}
        >
          Coinflip
        </button>
      </div>

      <div className="flex-1 p-3 space-y-2.5">
        {displayedVictories.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#8993A4] font-sans">
            <span className="block text-[#00E701] text-lg mb-1">✦</span>
            No recorded victories in this category yet.
          </div>
        ) : (
          displayedVictories.map((item, idx) => {
            const isLatest = idx === 0;
            return (
              <div
                key={item.id}
                className={`glass-capsule p-3 transition-all ${
                  isLatest
                    ? 'border-[#00E701]/50 shadow-[0_0_20px_rgba(205, 180, 134,0.15)]'
                    : 'border-white/[0.08]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono tracking-wider font-bold text-[#8993A4]">
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md uppercase font-bold border ${
                        item.gameType === 'coinflip'
                          ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30'
                          : 'bg-[#00E701]/10 text-[#00E701] border-[#00E701]/30'
                      }`}
                    >
                      {item.gameType === 'coinflip' ? 'COINFLIP' : 'JACKPOT'}
                    </span>
                  </div>
                  {isLatest && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#00E701] text-[#00E701] uppercase tracking-wider">
                      LATEST
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative w-8 h-8 rounded-xl border border-white/15 flex-shrink-0 overflow-hidden bg-white/5 shadow-inner">
                    <img
                      src={item.winnerAvatar || '/image/logo.png'}
                      alt={item.winnerName}
                      className="w-full h-full object-cover"
                    />
                    {item.coinSide && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#030508] border border-[#00E701] p-0.5">
                        <img
                          src={item.coinSide === 'heads' ? '/head.png' : '/tail.png'}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-sans font-bold text-[#F5F7FA] truncate">
                      {item.winnerName}
                    </p>
                    <p className="text-[10px] font-sans text-[#8993A4]">
                      {item.detail}
                    </p>
                  </div>
                </div>

                {/* Prize Inscribed Strip */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#8993A4]">
                    Awarded
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-[#00E701]">
                    <span>{item.totalPot.toLocaleString()}</span>
                    <span className="text-[9px] text-[#8993A4]">{TOKEN_SYMBOL}</span>
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
