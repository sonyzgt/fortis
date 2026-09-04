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
    <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col bg-[#EFE7DC] dark:bg-[#181614] border-r border-[#171513]/20 dark:border-[#E8DFD1]/15 h-full select-none transition-colors overflow-hidden">
      {/* Editorial Header Masthead */}
      <div className="p-4 border-b border-[#171513]/15 dark:border-[#E8DFD1]/10 bg-[#E8DFD1]/60 dark:bg-[#141311]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border border-[#9E8055]/50 p-0.5 bg-[#F4EFE6] flex items-center justify-center flex-shrink-0">
            <img src="/image/logo.png" alt="CashFlip" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-display font-bold tracking-[0.18em] text-[#171513] dark:text-[#E8DFD1] uppercase">
              CHRONICLES
            </h2>
            <p className="text-[10px] text-[#625B51] dark:text-[#9E968B] font-serif italic">
              Live Observatory Dispatch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#171513]/20 dark:border-[#E8DFD1]/20 rounded-none text-[9px] font-mono tracking-widest text-[#625B51] dark:text-[#9E968B]">
          <span className="w-1.5 h-1.5 rounded-full bg-brass animate-pulse" />
          <span>REAL-TIME</span>
        </div>
      </div>

      {/* Messages Stream inside Parchment Ledger */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto min-h-0 text-[#171513] dark:text-[#E8DFD1]">
        {messages.filter((m) => !m.isSystem).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#625B51] dark:text-[#9E968B] font-serif">
            <Feather className="w-6 h-6 mb-2 opacity-40 text-brass" />
            <p className="text-xs tracking-wider uppercase font-display">THE LEDGER IS SILENT</p>
            <p className="text-[11px] italic mt-1 max-w-[180px]">
              Inscribe the first dispatch to the assembly...
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
                  className={`p-2.5 border transition-all ${
                    isMe
                      ? 'bg-[#E3D7C5]/50 dark:bg-[#201E1A]/80 border-brass/50'
                      : 'bg-[#F7F2E9]/80 dark:bg-[#1C1A17]/80 border-[#171513]/10 dark:border-[#E8DFD1]/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={m.senderAvatar || '/image/logo.png'}
                        alt=""
                        className="w-5 h-5 border border-[#171513]/30 dark:border-[#E8DFD1]/30 flex-shrink-0 object-cover grayscale"
                      />
                      <span
                        className={`text-[11px] font-display font-bold truncate ${
                          isMe ? 'text-brass-dark dark:text-brass-light' : 'text-[#171513] dark:text-[#E8DFD1]'
                        }`}
                      >
                        {m.senderName}
                      </span>
                    </div>
                    {isMe && (
                      <span className="text-[8px] tracking-widest font-mono uppercase text-brass px-1 border border-brass/30">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#2B2724] dark:text-[#D5CCC0] leading-relaxed break-words font-serif">
                    {m.text}
                  </p>
                </div>
              );
            })
        )}
        <div ref={endRef} />
      </div>

      {/* Scriptorium Input Box */}
      <div className="p-3 border-t border-[#171513]/15 dark:border-[#E8DFD1]/10 bg-[#E8DFD1]/40 dark:bg-[#141311]/40 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Inscribe a transmission..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={140}
            className="flex-1 bg-white/60 dark:bg-black/30 border border-[#171513]/25 dark:border-[#E8DFD1]/20 px-3 py-2 text-xs font-serif text-[#171513] dark:text-[#E8DFD1] placeholder-[#625B51]/60 focus:outline-none focus:border-brass transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="editorial-btn-primary px-3 py-2 text-[10px] disabled:opacity-30 flex-shrink-0"
            title="Send dispatch"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
