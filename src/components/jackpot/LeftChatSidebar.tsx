'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/jackpot';
import { Send, MessageSquare, Lock, Gift, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { UserLevelInfo } from '@/lib/levelSystem';

interface LeftChatSidebarProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  currentUserId?: string;
  levelInfo?: UserLevelInfo;
  hasClaimedAirdrop?: boolean;
  onClaimAirdrop?: () => void;
  isClaimingAirdrop?: boolean;
  airdropRewardAmount?: number;
  airdropPoolBalance?: number;
}

export const LeftChatSidebar: React.FC<LeftChatSidebarProps> = ({
  messages,
  onSend,
  currentUserId,
  levelInfo,
  hasClaimedAirdrop = false,
  onClaimAirdrop,
  isClaimingAirdrop = false,
  airdropRewardAmount = 100,
  airdropPoolBalance = 10000,
}) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const safeLevelInfo = levelInfo || {
    level: 1,
    currentXp: 0,
    nextLevelXp: 100,
    prevLevelXp: 0,
    progressPercent: 0,
    gamesPlayed: 0,
    totalVolumePons: 0,
    isChatUnlocked: false,
    isAirdropUnlocked: false,
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !safeLevelInfo.isChatUnlocked) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <aside className="w-full lg:w-[285px] flex-shrink-0 flex flex-col bg-[#060b17]/95 backdrop-blur-2xl border-r border-cyan-500/20 h-full select-none transition-colors overflow-hidden">
      {/* Comms Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-cyan-500/20 bg-[#091224]/70">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-xs font-black text-white tracking-widest uppercase font-orbitron">COMMS</span>
          <span className="bg-cyan-950/80 border border-cyan-400/40 text-[#00f0ff] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
            LV. {safeLevelInfo.level}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[10px] text-cyan-300 font-bold">
            {safeLevelInfo.currentXp} XP
          </span>
          <div className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
        </div>
      </div>

      {/* Cyberpunk Airdrop Vault Banner */}
      <div className="mx-3 my-2.5 rounded-xl bg-[#09142b] border border-amber-500/30 p-3 flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase font-mono">
              AIRDROP VAULT
            </span>
          </div>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/30">
            {airdropPoolBalance.toLocaleString()} PONS
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-white font-mono tracking-tight">
              +{airdropRewardAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-amber-400 font-mono">PONS</span>
          </div>

          {!safeLevelInfo.isAirdropUnlocked ? (
            <button
              disabled
              className="px-3 py-1 bg-black/40 text-slate-400 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-not-allowed border border-white/10"
              title="Level 5 required to unlock airdrop claim"
            >
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>LV. 5 REQ</span>
            </button>
          ) : (
            <button
              onClick={onClaimAirdrop}
              disabled={hasClaimedAirdrop || isClaimingAirdrop}
              className={`px-3 py-1 text-[10px] font-black rounded transition-all flex items-center gap-1 font-mono ${
                hasClaimedAirdrop
                  ? 'bg-black/40 text-slate-500 border border-white/10 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] active:scale-95'
              }`}
              title={hasClaimedAirdrop ? 'Airdrop already claimed by this wallet' : 'Claim Community Airdrop (1x per wallet)'}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isClaimingAirdrop ? 'SIGNING...' : 'CLAIM (SIGN)'}</span>
            </button>
          )}
        </div>

        <div className="mt-1.5 text-[9px] text-slate-400 font-mono flex items-center justify-between border-t border-white/5 pt-1">
          <span>
            {hasClaimedAirdrop
              ? 'CLAIMED // SECURED'
              : safeLevelInfo.isAirdropUnlocked
              ? 'AVAILABLE NOW'
              : `LOCKED (${safeLevelInfo.level}/5)`}
          </span>
          <span className="text-amber-400 font-bold">1X PER WALLET</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-2 min-h-0">
        {messages.filter((m) => !m.isSystem).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3">
            <p className="text-[11px] text-slate-400 font-mono">NO COMMS ACTIVITY</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {safeLevelInfo.isChatUnlocked ? 'Broadcast a message to the arena!' : 'Reach Level 5 to transmit!'}
            </p>
          </div>
        ) : (
          messages
            .filter((m) => !m.isSystem)
            .map((m) => {
              const isMe = m.senderId === currentUserId;
              return (
                <div key={m.id} className="flex gap-2 py-1 group">
                  <img
                    src={m.senderAvatar || '/image/logo.png'}
                    alt=""
                    className="w-6 h-6 rounded bg-black/60 border border-cyan-500/30 flex-shrink-0 mt-0.5 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[11px] font-bold truncate font-cyber ${
                          isMe ? 'text-[#00f0ff]' : 'text-white'
                        }`}
                      >
                        {m.senderName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug break-words font-sans bg-[#0c1424]/60 p-1.5 rounded border border-white/5">
                      {m.text}
                    </p>
                  </div>
                </div>
              );
            })
        )}
        <div ref={endRef} />
      </div>

      {/* Cyber Chat Input or Locked Card based on Level 5 */}
      <div className="p-2.5 border-t border-cyan-500/20 flex-shrink-0 bg-[#060b17]">
        {!safeLevelInfo.isChatUnlocked ? (
          <div className="p-2.5 rounded-xl bg-[#091224] border border-cyan-500/30 text-center space-y-2 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-white font-mono">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>COMMS LOCKED (LV. 5)</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono leading-tight">
              Place bets to gain XP and unlock full transmission clearance!
            </p>

            {/* Level Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold">
                <span>LV. {safeLevelInfo.level}</span>
                <span>
                  {safeLevelInfo.currentXp} / {safeLevelInfo.nextLevelXp} XP ({safeLevelInfo.progressPercent}%)
                </span>
                <span className="text-[#00f0ff]">TARGET: LV. 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/60 border border-cyan-500/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] shadow-[0_0_8px_#00f0ff] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, (safeLevelInfo.currentXp / 1000) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Broadcast to arena..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={120}
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-[#091224] border border-cyan-500/30 rounded-lg text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all font-mono"
              />
              <button
                type="submit"
                className="cyber-btn-cyan p-2 rounded-lg transition-all shadow-sm active:scale-95 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-black" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-0.5 text-[9px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-[#00ff88] font-bold">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>COMMS ACTIVE (LV. {safeLevelInfo.level})</span>
              </span>
              <span className="text-cyan-400">ROBINHOOD L2</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

};
