'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/jackpot';
import { Send, MessageSquare, ChevronDown } from 'lucide-react';

interface LiveChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  compact?: boolean;
}

export const LiveChat: React.FC<LiveChatProps> = ({ messages, onSend, compact }) => {
  const [text, setText] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, collapsed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const EMOJIS = ['🚀', '🔥', '💎', '🤑', '👑', '🎰'];

  return (
    <div className={`flex flex-col bg-[#0d0d1f] border border-purple-500/20 rounded-2xl overflow-hidden ${compact ? 'w-full' : 'w-80'}`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-2.5 border-b border-purple-500/20 bg-purple-950/20 hover:bg-purple-950/30 transition-colors w-full"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">Live Chat</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 h-52 overflow-y-auto p-2.5 space-y-1.5 text-xs">
            {messages.length === 0 ? (
              <p className="text-center text-slate-500 py-6 italic">Be the first to send a message!</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-1.5 ${m.isSystem ? 'justify-center' : ''}`}
                >
                  {m.isSystem ? (
                    <span className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/20 text-purple-300 text-[11px]">
                      {m.text}
                    </span>
                  ) : (
                    <>
                      <img
                        src={m.senderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.senderId}`}
                        alt=""
                        className="w-5 h-5 rounded-full bg-slate-800 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-purple-400 mr-1">{m.senderName}:</span>
                        <span className="text-slate-200">{m.text}</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Emoji Quick Buttons */}
          <div className="flex gap-1 px-2.5 pb-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onSend(e)}
                className="hover:scale-125 text-base transition-transform px-1 py-0.5 rounded hover:bg-purple-900/40"
              >
                {e}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-1.5 p-2.5 border-t border-purple-500/10">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={100}
              className="flex-1 px-3 py-1.5 bg-[#06060f] border border-purple-500/20 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
            />
            <button
              type="submit"
              className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors flex items-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
