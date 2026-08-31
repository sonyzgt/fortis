'use client';

import React, { useEffect, useRef } from 'react';
import { WinnerInfo, PotParticipant } from '@/types/jackpot';
import confetti from 'canvas-confetti';
import { Trophy, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// Countdown Circular Timer (Cyan Neon Styling)
// ─────────────────────────────────────────────
interface CountdownTimerProps {
  timeRemaining: number;
  totalDuration?: number;
  isSpinning?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeRemaining,
  totalDuration = 15,
  isSpinning = false,
}) => {
  const radius = 34;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = Math.max(0, Math.min(1, timeRemaining / totalDuration));
  const strokeDashoffset = circumference - progress * circumference;

  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const ss = String(timeRemaining % 60).padStart(2, '0');

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          stroke="rgba(0, 240, 255, 0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={timeRemaining <= 10 ? '#ef4444' : '#00f0ff'}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.6))',
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {isSpinning ? (
          <span className="text-[10px] font-black text-[#00f0ff] animate-pulse">DRAW</span>
        ) : (
          <span className="text-xs font-mono font-black text-white tracking-tight">{mm}:{ss}</span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Odds Wheel Canvas (Cyan Futuristic Aesthetic)
// ─────────────────────────────────────────────
interface OddsWheelProps {
  participants: PotParticipant[];
  isSpinning?: boolean;
}

export const OddsWheel: React.FC<OddsWheelProps> = ({ participants, isSpinning = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = [
    '#00f0ff', '#10b981', '#38bdf8', '#8b5cf6',
    '#f59e0b', '#ec4899', '#14f195', '#06b6d4',
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    if (participants.length === 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 10;
      ctx.stroke();
      return;
    }

    let startAngle = -Math.PI / 2;
    participants.forEach((p, idx) => {
      const sliceAngle = (p.odds / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#060911';
      ctx.lineWidth = 3;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Inner hole for donut appearance
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.65, 0, 2 * Math.PI);
    ctx.fillStyle = '#080d19';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [participants]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        className={`rounded-full ${isSpinning ? 'animate-spin' : ''}`}
        style={{ animationDuration: isSpinning ? '0.6s' : undefined }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// Futuristic Glassmorphic Winner Banner Modal
// ─────────────────────────────────────────────
interface WinnerBannerProps {
  winner: WinnerInfo | null;
  onClose: () => void;
  onOpenPayout?: () => void;
  onClaimPot?: () => void;
  isCurrentUser?: boolean;
}

export const WinnerBanner: React.FC<WinnerBannerProps> = ({
  winner,
  onClose,
  onOpenPayout,
  onClaimPot,
  isCurrentUser,
}) => {
  useEffect(() => {
    if (winner) {
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#00f0ff', '#10b981', '#38bdf8', '#ffffff'],
      });

      const timer = setTimeout(onClose, 9000);
      return () => clearTimeout(timer);
    }
  }, [winner, onClose]);

  if (!winner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: -30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <div
          className="bg-gradient-to-b from-[#0a1528]/95 to-[#040812]/95 border-2 border-cyan-400/80 rounded-3xl p-7 shadow-[0_0_50px_rgba(0,240,255,0.4)] max-w-sm w-full text-center relative overflow-hidden backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top cyan ambient light glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy Icon */}
          <div className="w-18 h-18 p-3 rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-300 flex items-center justify-center mx-auto mb-3.5 shadow-xl shadow-cyan-500/30">
            <Trophy className="w-9 h-9 text-black" />
          </div>

          <div className="text-[11px] font-black text-[#00f0ff] uppercase tracking-[0.25em] mb-1.5 flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
            JACKPOT WINNER
            <Zap className="w-3.5 h-3.5 text-[#00f0ff]" />
          </div>

          <img
            src={winner.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.playerName}`}
            alt={winner.playerName}
            className="w-16 h-16 rounded-xl border-2 border-cyan-400 mx-auto mb-2 object-cover shadow-[0_0_15px_rgba(0,240,255,0.5)]"
          />
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">{winner.playerName}</h2>
          {winner.walletAddress && (
            <p className="text-xs text-slate-400 font-mono mb-3">
              {winner.walletAddress.slice(0, 8)}...{winner.walletAddress.slice(-6)}
            </p>
          )}

          <div className="p-3 rounded-2xl bg-[#060c18]/80 border border-cyan-500/30 mb-3 shadow-inner">
            <div className="text-4xl font-black text-[#00f0ff] font-mono tracking-tight flex items-center justify-center gap-1">
              <span>+{(winner.potWon / 1000).toFixed(3)}</span>
              <span className="text-xl text-emerald-400 font-bold">ETH</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Robinhood Chain L2 Settlement</p>
          </div>

          <div className="flex items-center justify-around text-xs text-slate-400 py-2 border-t border-cyan-500/15">
            <div>
              <p className="font-bold text-white font-mono">{winner.ticketCount}</p>
              <p className="text-[10px]">Tickets</p>
            </div>
            <div className="h-6 w-px bg-cyan-500/20" />
            <div>
              <p className="font-bold text-emerald-400 font-mono">{winner.odds}%</p>
              <p className="text-[10px]">Chance</p>
            </div>
            <div className="h-6 w-px bg-cyan-500/20" />
            <div>
              <p className="font-bold text-[#00f0ff] font-mono">#{winner.winningTicket}</p>
              <p className="text-[10px]">Ticket Lucky</p>
            </div>
          </div>

          {isCurrentUser && (
            <button
              onClick={() => {
                if (onClaimPot) {
                  onClaimPot();
                } else if (onOpenPayout) {
                  onClose();
                  onOpenPayout();
                }
              }}
              className="tactile-btn mt-4 w-full py-3.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-black rounded-xl text-xs transition-all shadow-[0_0_25px_rgba(0,240,255,0.5)] flex items-center justify-center gap-2 tracking-wider"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>CLAIM POT [ SIGN TRANSACTION ]</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="mt-2.5 w-full py-2 bg-[#0d1627] hover:bg-[#121f37] text-slate-300 rounded-xl text-xs font-bold transition-colors border border-cyan-500/20"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
