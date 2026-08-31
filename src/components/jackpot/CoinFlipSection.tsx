'use client';

import React, { useState } from 'react';
import { CoinFlipGame } from '@/types/jackpot';
import { AppUser } from '@/components/auth/PrivyProviderWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Clock, CheckCircle } from 'lucide-react';

interface CoinFlipSectionProps {
  games: CoinFlipGame[];
  user: AppUser | null;
  onCreateGame: (betAmount: number, side: 'heads' | 'tails') => void;
  onJoinGame: (gameId: string) => void;
  onCancelGame: (gameId: string) => void;
  onLogin: () => void;
}

export const CoinFlipSection: React.FC<CoinFlipSectionProps> = ({
  games,
  user,
  onCreateGame,
  onJoinGame,
  onCancelGame,
  onLogin,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');

  const PRESETS = [100, 500, 1000, 5000];

  const handleCreate = () => {
    if (!user) { onLogin(); return; }
    onCreateGame(betAmount, selectedSide);
    setShowCreate(false);
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl glass-panel">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2 tracking-wide">
            🪙 <span>COINFLIP 50/50</span>
          </h2>
          <p className="text-xs font-mono text-cyan-400">Head-to-head on-chain duel</p>
        </div>
        <button
          onClick={() => { if (!user) { onLogin(); return; } setShowCreate(!showCreate); }}
          className="tactile-btn flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
        >
          <Plus className="w-4 h-4" />
          CREATE GAME
        </button>
      </div>

      {/* Create Game Panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel rounded-2xl p-5 space-y-4 shadow-xl"
          >
            <h4 className="text-sm font-black text-white tracking-wide">CREATE NEW COINFLIP</h4>

            {/* Side selection */}
            <div>
              <p className="text-xs font-mono text-slate-400 mb-2">Select Side:</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setSelectedSide('heads')}
                  className={`tactile-btn py-3 rounded-xl font-black text-sm transition-all border-2 ${
                    selectedSide === 'heads'
                      ? 'border-[#00f0ff] bg-cyan-950/40 text-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-cyan-500/15 bg-[#060b16]/70 text-slate-400 hover:border-cyan-500/40'
                  }`}
                >
                  🦅 Heads
                </button>
                <button
                  onClick={() => setSelectedSide('tails')}
                  className={`tactile-btn py-3 rounded-xl font-black text-sm transition-all border-2 ${
                    selectedSide === 'tails'
                      ? 'border-emerald-400 bg-emerald-950/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'border-cyan-500/15 bg-[#060b16]/70 text-slate-400 hover:border-cyan-500/40'
                  }`}
                >
                  🔢 Tails
                </button>
              </div>
            </div>

            {/* Bet Amount */}
            <div>
              <p className="text-xs font-mono text-slate-400 mb-2">Bet Amount (pts):</p>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBetAmount(p)}
                    className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      betAmount === p
                        ? 'bg-cyan-500 text-black font-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                        : 'bg-[#080e1c] border border-cyan-500/20 text-slate-300 hover:bg-[#0c162c]'
                    }`}
                  >
                    {p.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={50}
                max={50000}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(50, Math.min(50000, Number(e.target.value))))}
                className="w-full px-3.5 py-2.5 bg-[#040810]/80 border border-cyan-500/30 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Equivalent: <span className="text-emerald-400 font-bold">{(betAmount / 1000).toFixed(3)} ETH</span> on Robinhood Chain
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 bg-[#0e1628] hover:bg-[#132039] text-slate-300 rounded-xl text-xs font-bold transition-colors border border-cyan-500/20"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="tactile-btn flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-black font-black rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                Confirm Duel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game List */}
      <div className="space-y-2">
        {games.length === 0 ? (
          <div className="py-12 text-center rounded-2xl glass-panel">
            <p className="text-3xl mb-2">🪙</p>
            <p className="text-sm font-bold text-white mb-1 font-mono">No active coinflips</p>
            <p className="text-xs text-slate-500 font-mono">Create a game or wait for an opponent to challenge!</p>
          </div>
        ) : (
          games.map((g) => {
            const isCreator = g.creatorId === user?.id;
            const isFlipping = g.status === 'flipping';
            const isComplete = g.status === 'complete';

            return (
              <div
                key={g.id}
                className="p-4 rounded-2xl glass-panel flex items-center justify-between gap-4 transition-all hover:border-cyan-400/40"
              >
                {/* Creator */}
                <div className="flex items-center gap-3">
                  <img
                    src={g.creatorAvatar}
                    alt={g.creatorName}
                    className="w-10 h-10 rounded-xl border border-cyan-500/30 object-cover"
                  />
                  <div>
                    <p className="text-xs font-black text-white leading-tight">{g.creatorName}</p>
                    <span className="text-[10px] font-mono font-bold text-cyan-400">
                      {g.creatorSide === 'heads' ? '🦅 Heads' : '🔢 Tails'}
                    </span>
                  </div>
                </div>

                {/* Center: Bet Amount & Status */}
                <div className="text-center flex-1">
                  <div className="flex items-center justify-center gap-1 font-mono font-black text-emerald-400 text-sm">
                    <span>Ξ</span>
                    <span>{(g.betAmount / 1000).toFixed(3)}</span>
                    <span className="text-[10px] text-slate-500">({g.betAmount} pts)</span>
                  </div>

                  {isFlipping ? (
                    <span className="text-[10px] font-mono font-black text-yellow-400 animate-pulse flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 animate-spin" /> Flipping Coin...
                    </span>
                  ) : isComplete ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3" /> Winner: {g.winnerName}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">Waiting Challenger</span>
                  )}
                </div>

                {/* Challenger or Action */}
                <div className="flex items-center gap-3">
                  {g.challengerName ? (
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-xs font-black text-white leading-tight">{g.challengerName}</p>
                        <span className="text-[10px] font-mono font-bold text-purple-400">
                          {g.creatorSide === 'heads' ? '🔢 Tails' : '🦅 Heads'}
                        </span>
                      </div>
                      <img
                        src={g.challengerAvatar}
                        alt={g.challengerName}
                        className="w-10 h-10 rounded-xl border border-cyan-500/30 object-cover"
                      />
                    </div>
                  ) : isCreator ? (
                    <button
                      onClick={() => onCancelGame(g.id)}
                      className="px-3 py-1.5 bg-[#0e1628] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-xl text-xs font-mono font-bold transition-all"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => { if (!user) { onLogin(); return; } onJoinGame(g.id); }}
                      className="tactile-btn px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-black rounded-xl text-xs font-black transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                    >
                      CHALLENGE
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
