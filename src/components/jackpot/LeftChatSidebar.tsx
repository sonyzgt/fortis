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
  className?: string;
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
  className = '',
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
    <aside className={`w-[275px] flex-shrink-0 flex flex-col bg-[#A4BAA2]/75 dark:bg-[#0e1914]/85 backdrop-blur-2xl border-r border-white/60 dark:border-[#718D76]/30 h-full select-none transition-colors ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/50 dark:border-[#718D76]/25">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#718D76] dark:text-emerald-400" />
          <span className="text-xs font-black text-[#243329] dark:text-white tracking-wide">Live Feed</span>
          <span className="bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/35 text-[#718D76] dark:text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
            Lv. {safeLevelInfo.level}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#526256] dark:text-slate-400 font-bold">
            {safeLevelInfo.currentXp} XP
          </span>
          <div className="w-2 h-2 rounded-full bg-[#718D76] dark:bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Admin Airdrop Vault Banner (1x Claim Per Wallet) */}
      <div className="mx-3 my-2.5 rounded-2xl bg-white/70 dark:bg-[#14241d]/80 border border-white/90 dark:border-[#718D76]/35 p-3 flex-shrink-0 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 tracking-wider">
              COMMUNITY AIRDROP
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
            Pool: {airdropPoolBalance.toLocaleString()} PONSPOT
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-[#243329] dark:text-white font-mono tracking-tight">
              +{airdropRewardAmount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-[#718D76] dark:text-emerald-400">PONSPOT</span>
          </div>

          {!safeLevelInfo.isAirdropUnlocked ? (
            <button
              disabled
              className="px-3 py-1 bg-black/10 dark:bg-white/10 text-[#526256] dark:text-slate-400 text-[10px] font-mono font-bold rounded-lg flex items-center gap-1 cursor-not-allowed opacity-60"
              title="Level 5 required to unlock airdrop claim"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Lv. 5 Req</span>
            </button>
          ) : (
            <button
              onClick={onClaimAirdrop}
              disabled={hasClaimedAirdrop || isClaimingAirdrop}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                hasClaimedAirdrop
                  ? 'bg-black/10 dark:bg-white/10 text-[#526256] dark:text-slate-500 border border-black/10 dark:border-white/10 cursor-not-allowed opacity-50 shadow-none'
                  : 'btn-primary-sage shadow-md active:scale-95'
              }`}
              title={hasClaimedAirdrop ? 'Airdrop already claimed by this wallet' : 'Claim Community Airdrop (1x per wallet)'}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{isClaimingAirdrop ? 'SIGNING...' : 'CLAIM (SIGN)'}</span>
            </button>
          )}
        </div>

        <div className="mt-1.5 text-[9px] text-[#526256] dark:text-slate-400 font-mono flex items-center justify-between">
          <span>
            {hasClaimedAirdrop
              ? 'Claimed (1x per wallet)'
              : safeLevelInfo.isAirdropUnlocked
              ? 'Available (1x per wallet)'
              : `Level 5 Req (${safeLevelInfo.level}/5)`}
          </span>
          <span className="text-[#718D76] dark:text-emerald-400 font-bold">1x Per Wallet</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-2 min-h-0">
        {messages.filter((m) => !m.isSystem).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3">
            <p className="text-[11px] text-[#526256] dark:text-slate-400 font-mono">No messages yet.</p>
            <p className="text-[10px] text-[#526256]/70 dark:text-slate-500 font-mono mt-0.5">
              {safeLevelInfo.isChatUnlocked ? 'Send a message to say hello!' : 'Reach Level 5 to join the chat!'}
            </p>
          </div>
        ) : (
          messages
            .filter((m) => !m.isSystem)
            .map((m) => {
              const isMe = m.senderId === currentUserId;
              return (
                <div key={m.id} className="flex gap-2 py-0.5 group">
                  <img
                    src={m.senderAvatar || '/image/logo.png'}
                    alt=""
                    className="w-6 h-6 rounded-lg bg-white/60 dark:bg-black/40 border border-white/80 dark:border-white/10 flex-shrink-0 mt-0.5 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isMe ? 'text-[#718D76] dark:text-emerald-400' : 'text-[#243329] dark:text-white'
                        }`}
                      >
                        {m.senderName}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#526256] dark:text-slate-300 leading-snug break-words font-sans">
                      {m.text}
                    </p>
                  </div>
                </div>
              );
            })
        )}
        <div ref={endRef} />
      </div>

      {/* Tactile Chat Input or Locked Card based on Level 5 */}
      <div className="p-2.5 border-t border-white/50 dark:border-[#718D76]/25 flex-shrink-0 bg-white/50 dark:bg-[#0c1611]/85">
        {!safeLevelInfo.isChatUnlocked ? (
          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-[#14241d]/90 border border-white/90 dark:border-[#718D76]/40 text-center space-y-2 shadow-sm">
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#243329] dark:text-white">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>CHAT LOCKED (LV. 5)</span>
            </div>
            <p className="text-[10px] text-[#526256] dark:text-slate-400 font-mono leading-tight">
              Place bets to level up and unlock chat & airdrop perks!
            </p>

            {/* Level Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[9px] font-mono text-[#526256] dark:text-slate-400 font-bold">
                <span>Lv. {safeLevelInfo.level}</span>
                <span>
                  {safeLevelInfo.currentXp} / {safeLevelInfo.nextLevelXp} XP ({safeLevelInfo.progressPercent}%)
                </span>
                <span className="text-[#718D76] dark:text-emerald-400">Target: Lv. 5</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#718D76] to-emerald-400 transition-all duration-300"
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
                placeholder="Type a chat message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={120}
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-white/70 dark:bg-[#122019]/80 border border-white/90 dark:border-[#718D76]/35 rounded-xl text-[11px] text-[#243329] dark:text-white placeholder-[#526256]/60 dark:placeholder-slate-500 focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400 transition-colors"
              />
              <button
                type="submit"
                className="btn-primary-sage p-2 rounded-xl transition-all shadow-sm active:scale-95 flex-shrink-0"
              >
                <Send className="w-3 h-3 text-[#F5F8F3]" />
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-0.5 text-[9px] text-[#526256] dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Chat Unlocked (Lv. {safeLevelInfo.level})</span>
              </span>
              <span>Online • Web3</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
