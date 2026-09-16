'use client';

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { TOKEN_SYMBOL } from '@/lib/web3/contracts';

interface BetEntry {
  id: string;
  game: string;
  player: string;
  wager: number;
  multiplier: number;
  payout: number;
  won: boolean;
  time: number;
}

const GAME_COLORS: Record<string, string> = {
  Jackpot:  '#FFC432',
  Coinflip: '#00E701',
  Mines:    '#1475E1',
  Cups:     '#E74C3C',
};

const GAME_ICONS: Record<string, string> = {
  Jackpot:  '🏆',
  Coinflip: '🪙',
  Mines:    '💎',
  Cups:     '🎯',
};

export function StakeLiveBets() {
  const [entries, setEntries] = useState<BetEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'high_rollers'>('all');
  const { socket } = useSocket();

  // Listen exclusively to REAL socket game events from real players
  useEffect(() => {
    if (!socket) return;

    const onGameResult = (data: any) => {
      if (!data) return;
      const entry: BetEntry = {
        id: data.id || data.gameId || Math.random().toString(36).substring(2, 9),
        game: data.game || 'Jackpot',
        player: data.player ? `${data.player.slice(0, 6)}...${data.player.slice(-4)}` : '0xUser...F4',
        wager: Number(data.amount || data.wager || data.betAmount || 0),
        multiplier: Number(data.multiplier || (data.payout && data.wager ? (data.payout / data.wager).toFixed(2) : 2)),
        payout: Number(data.payout || data.prize || 0),
        won: Boolean(data.won !== false),
        time: Date.now(),
      };
      setEntries((prev) => [entry, ...prev.slice(0, 49)]);
    };

    socket.on('game_result', onGameResult);
    socket.on('jackpot_ended', onGameResult);
    socket.on('coinflip_resolved', onGameResult);
    socket.on('cups_result', onGameResult);
    socket.on('mines_cashout', onGameResult);

    return () => {
      socket.off('game_result', onGameResult);
      socket.off('jackpot_ended', onGameResult);
      socket.off('coinflip_resolved', onGameResult);
      socket.off('cups_result', onGameResult);
      socket.off('mines_cashout', onGameResult);
    };
  }, [socket]);

  const displayedEntries = activeTab === 'high_rollers' 
    ? entries.filter(e => e.wager >= 100) 
    : entries;

  return (
    <div className="bg-[#1A2C38] border border-[#213743] rounded-2xl overflow-hidden shadow-md">
      {/* Header with tabs */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#213743] gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E701] animate-pulse" />
          <h3 className="text-white font-bold text-sm tracking-wide">Live Casino Bets</h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-[#071824] p-1 rounded-lg border border-[#213743]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#213743] text-white'
                : 'text-[#B1BAD3] hover:text-white'
            }`}
          >
            All Bets
          </button>
          <button
            onClick={() => setActiveTab('high_rollers')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'high_rollers'
                ? 'bg-[#213743] text-white'
                : 'text-[#B1BAD3] hover:text-white'
            }`}
          >
            High Rollers
          </button>
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#557086] border-b border-[#213743]/60 bg-[#0F212E]/70">
        <span>Game</span>
        <span>User</span>
        <span className="text-center">Bet Amount</span>
        <span className="text-right">Payout</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-[#213743]/50 max-h-[380px] overflow-y-auto">
        {displayedEntries.length === 0 ? (
          <div className="py-12 px-4 text-center text-[#557086]">
            <div className="text-2xl mb-2">🎲</div>
            <p className="text-sm font-semibold text-[#B1BAD3]">No active bets yet</p>
            <p className="text-xs mt-1">Real-time player bets will appear here when a game finishes.</p>
          </div>
        ) : (
          displayedEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-4 px-5 py-2.5 text-xs sm:text-sm items-center hover:bg-[#213743]/40 transition-colors animate-slide-in-up"
            >
              {/* Game */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{GAME_ICONS[entry.game] || '🎮'}</span>
                <span
                  className="font-bold text-xs truncate"
                  style={{ color: GAME_COLORS[entry.game] || '#FFFFFF' }}
                >
                  {entry.game}
                </span>
              </div>

              {/* Player address */}
              <span className="text-[#B1BAD3] font-mono text-xs truncate font-medium">
                {entry.player}
              </span>

              {/* Wager */}
              <span className="text-center text-white font-mono text-xs font-semibold">
                {entry.wager.toFixed(2)} <span className="text-[#557086] text-[10px]">{TOKEN_SYMBOL}</span>
              </span>

              {/* Payout */}
              <div className="text-right font-mono text-xs font-bold">
                {entry.won ? (
                  <span className="text-[#00E701]">
                    +{entry.payout.toFixed(2)} {TOKEN_SYMBOL}
                  </span>
                ) : (
                  <span className="text-[#E74C3C]">
                    0.00 {TOKEN_SYMBOL}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
