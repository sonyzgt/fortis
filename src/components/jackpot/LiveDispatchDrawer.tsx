'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/types/jackpot';
import { UserLevelInfo } from '@/lib/levelSystem';
import { X, CornerDownLeft, Terminal, Radio } from 'lucide-react';

interface LiveDispatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  currentUserId?: string;
  levelInfo?: UserLevelInfo;
}

export const LiveDispatchDrawer: React.FC<LiveDispatchDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSend,
  currentUserId,
  levelInfo,
}) => {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '00:00:00';
    const d = new Date(timestamp);
    return d.toTimeString().split(' ')[0];
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#030508]/80 backdrop-blur-xl transition-opacity cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-[#030508]/95 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto select-none font-sans"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/25 flex items-center justify-center text-[#CDB486] shadow-inner">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#8993A4]">
                        LIVE CHAT
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#CDB486] shadow-[0_0_8px_#CDB486] animate-pulse" />
                    </div>
                    <h2 className="font-heading text-sm sm:text-base font-bold tracking-wide text-[#F5F7FA]">
                      DISPATCH FEED
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="glass-pill-active text-[10px] font-mono px-2.5 py-0.5 hidden sm:inline">
                    {messages.length} EVENTS
                  </span>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] transition-all cursor-pointer"
                    aria-label="Close Live Dispatch"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Feed */}
              <div className="flex-1 p-4 sm:p-5 space-y-3 overflow-y-auto min-h-0 text-xs">
                {messages.length === 0 ? (
                  <div className="py-24 text-center text-[#8993A4] space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#CDB486]/10 border border-[#CDB486]/20 flex items-center justify-center mx-auto text-[#CDB486]">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className="text-xs uppercase tracking-wider font-mono">Awaiting dispatch transmissions...</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isSystem = m.isSystem || m.senderId === 'system';
                    const isMe =
                      currentUserId &&
                      m.senderId &&
                      m.senderId.toLowerCase() === currentUserId.toLowerCase();

                    return (
                      <div
                        key={m.id || idx}
                        className={`p-3.5 glass-capsule rounded-2xl transition-all ${
                          isSystem
                            ? 'border-[#CDB486]/30 bg-[#CDB486]/[0.04]'
                            : isMe
                            ? 'border-[#CDB486]/40 bg-[#CDB486]/[0.08] shadow-[0_0_15px_rgba(205, 180, 134,0.08)]'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-white/[0.05] mb-2 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[#8993A4]/60">{formatTime(m.timestamp)}</span>
                            <span
                              className={`font-bold tracking-wider uppercase ${
                                isSystem
                                  ? 'text-[#CDB486]'
                                  : isMe
                                  ? 'text-[#D8C6A5]'
                                  : 'text-[#F5F7FA]'
                              }`}
                            >
                              {isSystem
                                ? 'SYSTEM'
                                : isMe
                                ? `${m.senderName || 'YOU'} [ME]`
                                : m.senderName || 'CONTENDER'}
                            </span>
                          </div>

                          {m.senderId && !isSystem && (
                            <span className="text-[10px] text-[#8993A4]">
                              {m.senderId.slice(0, 6)}...{m.senderId.slice(-4)}
                            </span>
                          )}
                        </div>

                        <p className="text-[#F5F7FA] text-xs leading-relaxed break-words">
                          {m.text}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Dispatch Inscription Console */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={150}
                    className="glass-input flex-1 px-4 py-2.5 text-xs text-[#F5F7FA] placeholder-[#8993A4]/50"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="glass-btn-inflated px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span>SEND</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex justify-between items-center pt-2 px-1 text-[10px] font-mono text-[#8993A4]">
                  <span>LIVE CHAT</span>
                  <span>ENTER ↵</span>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
