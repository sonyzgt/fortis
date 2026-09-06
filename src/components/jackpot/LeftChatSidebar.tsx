'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/jackpot';
import { Send, Feather } from 'lucide-react';
import { UserLevelInfo } from '@/lib/levelSystem';

interface LeftChatSidebarProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  currentUserId?: string;
  levelInfo?: UserLevelInfo;
}

export const LeftChatSidebar: React.FC<LeftChatSidebarProps> = ({
  messages,
  onSend,
  currentUserId,
  levelInfo,
}) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col bg-[#080C14] border-r border-[#CDB486]/15 h-full select-none transition-colors overflow-hidden font-sans">
      {/* Cyber Header Masthead */}
      <div className="p-4 border-b border-[#CDB486]/15 bg-[#0D1322]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg border border-[#CDB486]/30 p-0.5 bg-[#05070B] flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(205, 180, 134,0.15)]">
            <img src="/image/logo.png" alt="Kofuku" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold tracking-[0.18em] text-[#E2E8F0] uppercase">
              LOUNGE CHAT
            </h2>
            <p className="text-[10px] text-[#94A3B8] font-mono">
              Live VIP Dispatch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#CDB486]/30 rounded-md text-[9px] font-mono tracking-widest text-[#CDB486] bg-[#CDB486]/10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#CDB486] animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Messages Stream inside Cyber Obsidian Panel */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto min-h-0 text-[#E2E8F0]">
        {messages.filter((m) => !m.isSystem).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#94A3B8]">
            <Feather className="w-6 h-6 mb-2 opacity-30 text-[#CDB486]" />
            <p className="text-xs tracking-wider uppercase font-mono font-bold text-white">THE LOUNGE IS QUIET</p>
            <p className="text-[11px] italic mt-1 max-w-[180px] text-[#94A3B8]">
              Send the first transmission to fellow contenders...
            </p>
          </div>
        ) : (
          messages
            .filter((m) => !m.isSystem)
            .map((m) => {
              const isMe = m.senderId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-[#CDB486]/10 to-[#0D1322] border-[#CDB486]/40 shadow-[0_0_15px_rgba(205, 180, 134,0.1)]'
                      : 'bg-[#0D1322]/60 border-white/5 hover:border-[#CDB486]/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={m.senderAvatar || '/image/logo.png'}
                        alt=""
                        className="w-5 h-5 rounded-md border border-[#CDB486]/20 flex-shrink-0 object-cover"
                      />
                      <span
                        className={`text-[11px] font-mono font-bold truncate ${
                          isMe ? 'text-[#CDB486]' : 'text-white'
                        }`}
                      >
                        {m.senderName}
                      </span>
                    </div>
                    {isMe && (
                      <span className="text-[9px] tracking-widest font-mono font-bold uppercase text-[#CDB486] px-1.5 py-0.5 rounded bg-[#CDB486]/15 border border-[#CDB486]/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed break-words font-sans">
                    {m.text}
                  </p>
                </div>
              );
            })
        )}
        <div ref={endRef} />
      </div>

      {/* Scriptorium Input Box */}
      <div className="p-3 border-t border-[#CDB486]/15 bg-[#0D1322]/80 backdrop-blur-md flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Send a transmission..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={140}
            className="flex-1 bg-[#05070B] border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#CDB486] transition-all"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-2 rounded-xl bg-[#CDB486] hover:bg-[#D8C6A5] text-[#05070B] font-bold shadow-[0_0_12px_rgba(205, 180, 134,0.3)] disabled:opacity-30 flex-shrink-0 cursor-pointer transition-all"
            title="Send dispatch"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
