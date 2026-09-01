'use client';

import React, { useState } from 'react';
import { LeaderboardEntry, PastRound } from '@/types/jackpot';
import { Trophy, Clock, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  pastRounds: PastRound[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, pastRounds }) => {
  const [tab, setTab] = useState<'top' | 'recent'>('recent');

  return (
    <div className="flex flex-col bg-[#0d0d1f] border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-500/20">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-xs font-bold text-slate-200">Leaderboard & Winners</h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-purple-500/10">
        <button
          onClick={() => setTab('top')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
            tab === 'top' ? 'text-purple-400 bg-purple-950/30 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-3 h-3" /> Top Players
        </button>
        <button
          onClick={() => setTab('recent')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
            tab === 'recent' ? 'text-purple-400 bg-purple-950/30 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Clock className="w-3 h-3" /> Recent Winners
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-h-80">
        <AnimatePresence mode="wait">
          {tab === 'top' ? (
            <motion.div
              key="top"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-2 space-y-1"
            >
              {entries.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-6 italic">No winners yet</p>
              ) : (
                entries.map((e, idx) => (
                  <div
                    key={e.playerId}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-950/10 hover:bg-purple-950/20 transition-colors"
                  >
                    <span className={`w-5 h-5 text-[11px] font-black flex items-center justify-center rounded-full flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-500 text-yellow-900' :
                      idx === 1 ? 'bg-slate-400 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <img
                      src={e.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${e.playerId}`}
                      alt=""
                      className="w-7 h-7 rounded-full bg-slate-800 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{e.playerName}</p>
                      <p className="text-[10px] text-slate-500">{e.winsCount}x Wins</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-black text-emerald-400">{e.totalWon.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">coins</p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="recent"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-2 space-y-1"
            >
              {pastRounds.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-6 italic">No rounds completed yet</p>
              ) : (

                pastRounds.map((r) => {
                  const w = r.winner;
                  const ago = Math.floor((Date.now() - r.timestamp) / 60000);
                  return (
                    <div
                      key={r.roundNumber}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-950/10 hover:bg-purple-950/20 transition-colors"
                    >
                      <img
                        src={w.playerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${w.playerId}`}
                        alt=""
                        className="w-8 h-8 rounded-full bg-slate-800 border border-yellow-400/30 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{w.playerName}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="text-emerald-400 font-mono">{w.odds}% odds</span>
                          <span>·</span>
                          <span>{ago < 1 ? 'baru saja' : `${ago}m lalu`}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-yellow-400">{r.totalPot.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500">koin</p>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
