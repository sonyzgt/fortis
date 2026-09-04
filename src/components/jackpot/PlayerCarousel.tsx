'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PotParticipant, PastRound, WinnerInfo } from '@/types/jackpot';
import { useSound } from '@/context/SoundContext';
import { BookplateCorner } from '@/components/ui/CelestialFlourish';

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
  participants,
  isSpinning,
  winner,
}) => {
  const { playTick, playSuspenseRiser, playRollStart, playWin, pauseBgm, resumeBgm } = useSound();

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

  const isSpinActiveRef = useRef(false);

  useEffect(() => {
    let rollDelayTimer: NodeJS.Timeout | null = null;

    if (isSpinning && reelLen > 0) {
      if (isSpinActiveRef.current) {
        // Guard against duplicate execution: only spin once per round!
        return;
      }
      isSpinActiveRef.current = true;
      setHasLandedWinner(false);
      setIsDarkening(true);

      // Pause backsound when jackpot spin commences
      pauseBgm();

      // Play dramatic cinematic suspense riser
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

      // High-speed start through 50-90 cards
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

      rollDelayTimer = setTimeout(() => {
        playRollStart();
        spinStartTimeRef.current = performance.now();
        isDeceleratingRef.current = true;
      }, 950);
    } else if (!isSpinning) {
      isSpinActiveRef.current = false;
      if (isDeceleratingRef.current && spinTargetOffsetRef.current) {
        offsetRef.current = spinTargetOffsetRef.current;
        setCurrentOffset(spinTargetOffsetRef.current);
      }
      isDeceleratingRef.current = false;
      setIsDarkening(false);
    }

    return () => {
      if (rollDelayTimer) clearTimeout(rollDelayTimer);
    };
  }, [isSpinning, winner?.playerId, winner?.walletAddress, reelLen, pauseBgm, playSuspenseRiser, playRollStart]);

  useEffect(() => {
    const animate = (now: number) => {
      if (isDeceleratingRef.current) {
        const elapsed = now - spinStartTimeRef.current;
        const duration = spinDurationRef.current;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

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
          // Resume backsound after victory chime concludes
          setTimeout(() => {
            resumeBgm();
          }, 3500);
        }
        setCurrentOffset(offsetRef.current);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasLandedWinner, isSpinning, playTick, playWin, resumeBgm]);

  // Viewport Container Wrapper
  const renderViewport = (children: React.ReactNode) => (
    <div className="relative w-full my-6 overflow-visible">
      {/* Engraved Celestial Crescent Indicator Pin */}
      <CarouselIndicatorPin isSpinning={isSpinning} />

      {/* Antique Armillary Enclosure Frame */}
      <div
        className={`relative w-full border transition-all duration-700 overflow-hidden ${
          isDarkening || isSpinning
            ? 'bg-[#100F0E] border-brass shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
            : 'bg-[#F2ECE1] dark:bg-[#1B1916] border-[#171513]/25 dark:border-[#E8DFD1]/20 shadow-[0_8px_30px_rgba(23,21,19,0.08)]'
        }`}
      >
        {/* Bookplate Corners */}
        <BookplateCorner position="tl" />
        <BookplateCorner position="tr" />
        <BookplateCorner position="bl" />
        <BookplateCorner position="br" />

        {/* Astronomical coordinate lines */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#171513]/15 dark:via-[#E8DFD1]/15 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#171513]/15 dark:via-[#E8DFD1]/15 to-transparent pointer-events-none" />

        {/* Dynamic Vignette during spin */}
        {(isDarkening || isSpinning) && (
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-brass/25 via-brass/5 to-transparent rounded-full blur-2xl animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(16,15,14,0.9)_100%)]" />
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

    return renderViewport(
      visibleCards.map(({ key, relPos, isPlayer, isCenter }) => {
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
// Antique Engraved Crescent Needle Indicator
// ─────────────────────────────────────────────
interface CarouselIndicatorPinProps {
  isSpinning?: boolean;
}

const CarouselIndicatorPin: React.FC<CarouselIndicatorPinProps> = ({ isSpinning = false }) => {
  return (
    <div
      style={{ left: 'calc(50% - 15px)' }}
      className={`absolute -top-3.5 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none ${
        isSpinning ? 'animate-[bounce_0.22s_infinite]' : ''
      }`}
    >
      <div className="relative filter drop-shadow-[0_4px_8px_rgba(23,21,19,0.35)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
        <svg
          width="30"
          height="32"
          viewBox="0 0 30 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Engraved Brass Needle pointing downward */}
          <path
            d="M 5,2 L 25,2 L 15,28 Z"
            fill="#171513"
            stroke="#9E8055"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner Inset Line */}
          <path
            d="M 9,5 L 21,5 L 15,22 Z"
            fill="#9E8055"
            opacity="0.9"
          />
          {/* North Star Crown */}
          <circle cx="15" cy="8" r="2.2" fill="#FAF6EE" />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Antique Woodcut Bookplate Token Card
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
      className={`relative flex flex-col items-center gap-2.5 py-4 px-3.5 transition-all duration-150 select-none ${
        isWinner
          ? 'bg-[#FAF5EA] dark:bg-[#2A2419] border-2 border-brass shadow-[0_12px_28px_rgba(158,128,85,0.4)] text-[#171513] dark:text-[#E8DFD1]'
          : isCenter
          ? 'bg-[#FDFCFA] dark:bg-[#22201C] border border-[#171513] dark:border-brass shadow-[0_10px_24px_rgba(23,21,19,0.18)] text-[#171513] dark:text-[#E8DFD1]'
          : 'bg-[#EDE4D6] dark:bg-[#181614] border border-[#171513]/25 dark:border-[#E8DFD1]/15 opacity-85 text-[#171513] dark:text-[#E8DFD1]'
      }`}
    >
      {/* Corner Engraving Marks */}
      <span className="absolute top-1 left-1 text-[7px] text-brass opacity-60">✦</span>
      <span className="absolute top-1 right-1 text-[7px] text-brass opacity-60">✦</span>

      {/* Center Marker Line */}
      {isCenter && !isWinner && (
        <div className="absolute -top-[1px] inset-x-4 h-[2px] bg-brass shadow-[0_0_8px_rgba(158,128,85,0.8)]" />
      )}
      {isWinner && (
        <div className="absolute -top-[1px] inset-x-2 h-[3px] bg-brass animate-pulse shadow-[0_0_12px_rgba(188,161,114,1)]" />
      )}

      {/* Engraved Woodcut Avatar Frame */}
      <div
        className={`relative p-1 border ${
          isWinner
            ? 'border-brass bg-brass/10'
            : isCenter
            ? 'border-[#171513] dark:border-brass'
            : 'border-[#171513]/30 dark:border-[#E8DFD1]/20'
        }`}
      >
        <img
          src={p.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerId}`}
          alt={p.playerName}
          className="w-14 h-14 object-cover grayscale contrast-125"
          draggable={false}
        />
        {isWinner && (
          <div className="absolute inset-0 bg-brass/30 flex items-center justify-center">
            <span className="text-xl">👑</span>
          </div>
        )}
      </div>

      {/* Player Name */}
      <p className="text-xs font-display font-bold tracking-wide truncate w-full text-center">
        {p.playerName.length > 14 ? p.playerName.slice(0, 13) + '…' : p.playerName}
      </p>

      {/* Token Ledger Pill */}
      <div className="flex items-center gap-1.5 px-2.5 py-0.5 border border-[#171513]/25 dark:border-[#E8DFD1]/20 bg-[#E8DFD1]/50 dark:bg-[#141311]/50 text-[10px] font-mono tracking-wider">
        <span className="text-brass">✦</span>
        <span className="font-bold">
          {p.totalSpent >= 1000 ? `${(p.totalSpent / 1000).toFixed(1)}k` : p.totalSpent}
        </span>
        <span className="text-[9px] opacity-70">USDG</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Antique Waiting Placeholder Card
// ─────────────────────────────────────────────
interface PlaceholderCardProps {
  isCenter?: boolean;
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ isCenter = false }) => (
  <div
    style={{ width: 165 }}
    className={`relative flex flex-col items-center gap-2.5 py-4 px-3.5 select-none transition-all duration-150 ${
      isCenter
        ? 'bg-[#FDFCFA] dark:bg-[#22201C] border border-brass shadow-[0_8px_20px_rgba(23,21,19,0.12)]'
        : 'bg-[#EDE4D6] dark:bg-[#181614] border border-[#171513]/20 dark:border-[#E8DFD1]/15 opacity-60'
    }`}
  >
    <span className="absolute top-1 left-1 text-[7px] text-brass opacity-40">✦</span>
    <span className="absolute top-1 right-1 text-[7px] text-brass opacity-40">✦</span>

    {/* Center Indicator */}
    {isCenter && (
      <div className="absolute -top-[1px] inset-x-4 h-[2px] bg-brass shadow-[0_0_8px_rgba(158,128,85,0.6)]" />
    )}

    {/* Empty Astronomical Seal Socket */}
    <div className="w-14 h-14 border border-dashed border-[#171513]/30 dark:border-[#E8DFD1]/30 flex items-center justify-center">
      <span className="text-brass text-lg opacity-60">☽</span>
    </div>

    {/* Elegant Waiting Notation */}
    <p className="text-[11px] font-serif italic text-[#625B51] dark:text-[#9E968B] tracking-wider">
      Awaiting Initiate...
    </p>

    {/* Ledger Stake Empty */}
    <div className="flex items-center gap-1.5 px-2.5 py-0.5 border border-dashed border-[#171513]/20 dark:border-[#E8DFD1]/15 text-[9px] font-mono text-[#625B51] dark:text-[#9E968B]">
      <span>0.00 USDG</span>
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
          detail: winningSide === 'heads' ? 'Head (Luna Cat)' : 'Tail (Crescent)',
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
    <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col bg-[#EFE7DC] dark:bg-[#181614] border-l border-[#171513]/20 dark:border-[#E8DFD1]/15 h-full overflow-y-auto select-none transition-colors">
      {/* Editorial Chronicle Masthead */}
      <div className="p-4 border-b border-[#171513]/15 dark:border-[#E8DFD1]/10 bg-[#E8DFD1]/60 dark:bg-[#141311]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border border-[#9E8055]/50 p-0.5 bg-[#F4EFE6] flex items-center justify-center flex-shrink-0">
            <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-display font-bold tracking-[0.18em] text-[#171513] dark:text-[#E8DFD1] uppercase">
              ARCHIVES
            </h2>
            <p className="text-[10px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
              Historical Victories
            </p>
          </div>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#625B51] dark:text-[#9E968B] border border-[#171513]/20 dark:border-[#E8DFD1]/20 px-1.5 py-0.5">
          ORD. #{totalCount}
        </span>
      </div>

      {/* Filter Tabs: ALL / JACKPOT / COINFLIP */}
      <div className="flex items-center border-b border-[#171513]/15 dark:border-[#E8DFD1]/10 bg-[#E8DFD1]/40 dark:bg-[#141311]/40 text-[10px] font-serif">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`flex-1 py-1.5 text-center font-bold tracking-wider uppercase transition-colors border-r border-[#171513]/10 dark:border-[#E8DFD1]/10 ${
            filterType === 'all'
              ? 'bg-[#FAF5EA] dark:bg-[#201E1B] text-[#9E8055] dark:text-[#DFC493] border-b-2 border-b-[#9E8055]'
              : 'text-[#625B51] dark:text-[#9E968B] hover:text-[#171513] dark:hover:text-[#E8DFD1]'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('jackpot')}
          className={`flex-1 py-1.5 text-center font-bold tracking-wider uppercase transition-colors border-r border-[#171513]/10 dark:border-[#E8DFD1]/10 ${
            filterType === 'jackpot'
              ? 'bg-[#FAF5EA] dark:bg-[#201E1B] text-[#9E8055] dark:text-[#DFC493] border-b-2 border-b-[#9E8055]'
              : 'text-[#625B51] dark:text-[#9E968B] hover:text-[#171513] dark:hover:text-[#E8DFD1]'
          }`}
        >
          Jackpot ({jackpotVictories.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('coinflip')}
          className={`flex-1 py-1.5 text-center font-bold tracking-wider uppercase transition-colors ${
            filterType === 'coinflip'
              ? 'bg-[#FAF5EA] dark:bg-[#201E1B] text-[#9E8055] dark:text-[#DFC493] border-b-2 border-b-[#9E8055]'
              : 'text-[#625B51] dark:text-[#9E968B] hover:text-[#171513] dark:hover:text-[#E8DFD1]'
          }`}
        >
          Coinflip ({coinflipVictories.length})
        </button>
      </div>

      <div className="flex-1 p-3.5 space-y-3">
        {displayedVictories.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#625B51] dark:text-[#9E968B] font-serif italic">
            <span className="block text-brass text-lg mb-1">☽</span>
            No recorded victories in this category yet.
          </div>
        ) : (
          displayedVictories.map((item, idx) => {
            const isLatest = idx === 0;
            return (
              <div
                key={item.id}
                className={`p-3 border transition-all ${
                  isLatest
                    ? 'bg-[#FAF5EA] dark:bg-[#221F1B] border-brass/60 shadow-sm'
                    : 'bg-[#F7F2E9]/70 dark:bg-[#1C1A17]/70 border-[#171513]/10 dark:border-[#E8DFD1]/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono tracking-wider font-bold text-[#625B51] dark:text-[#9E968B]">
                      {item.label}
                    </span>
                    <span
                      className={`text-[8px] font-mono px-1 py-0.2 uppercase font-bold border ${
                        item.gameType === 'coinflip'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : 'bg-[#9E8055]/15 text-[#9E8055] dark:text-[#DFC493] border-[#9E8055]/30'
                      }`}
                    >
                      {item.gameType === 'coinflip' ? 'COINFLIP' : 'JACKPOT'}
                    </span>
                  </div>
                  {isLatest && (
                    <span className="text-[8px] font-display font-bold px-1.5 py-0.5 border border-brass text-brass uppercase tracking-widest">
                      LATEST
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative w-8 h-8 border border-[#171513]/30 dark:border-[#E8DFD1]/30 flex-shrink-0 overflow-hidden bg-[#E8DFD1] dark:bg-[#1A1816]">
                    <img
                      src={item.winnerAvatar || '/image/logo.png'}
                      alt={item.winnerName}
                      className="w-full h-full object-cover grayscale contrast-125"
                    />
                    {item.coinSide && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#F4EFE6] dark:bg-[#171513] border border-[#9E8055] p-0.5">
                        <img
                          src={item.coinSide === 'heads' ? '/head.png' : '/tail.png'}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-display font-bold text-[#171513] dark:text-[#E8DFD1] truncate">
                      {item.winnerName}
                    </p>
                    <p className="text-[10px] font-serif italic text-[#625B51] dark:text-[#9E968B]">
                      {item.detail}
                    </p>
                  </div>
                </div>

                {/* Prize Inscribed Strip */}
                <div className="pt-1.5 border-t border-[#171513]/10 dark:border-[#E8DFD1]/10 flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-serif tracking-wider text-[#625B51] dark:text-[#9E968B]">
                    Awarded
                  </span>
                  <div className="flex items-center gap-1 font-mono font-bold text-brass-dark dark:text-brass-light">
                    <span>{item.totalPot.toLocaleString()}</span>
                    <span className="text-[9px] text-[#625B51] dark:text-[#9E968B]">USDG</span>
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
