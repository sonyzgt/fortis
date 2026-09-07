'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Search, RefreshCw, Copy, ShieldCheck } from 'lucide-react';
import { verifyGameClientSide, TOKEN_SYMBOL } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface VerifyModalProps {
  isOpen: boolean;
  gameId: string | null;
  onClose: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, gameId, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [inputGameId, setInputGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<any | null>(null);
  const [verifyReport, setVerifyReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (gameId) {
      setInputGameId(gameId);
      fetchGame(gameId);
    }
  }, [gameId, isOpen]);

  const fetchGame = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setVerifyReport(null);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/game/${id.trim()}`);
      if (!res.ok) {
        throw new Error('Game not found or round still currently running.');
      }
      const data = await res.json();
      setGameData(data);

      if (data.revealedServerSeed && data.winningTicket !== undefined) {
        const report = await verifyGameClientSide(
          data.revealedServerSeed,
          data.serverSeedHash,
          data.publicSeed,
          data.nonce,
          data.gameId,
          data.gameHash,
          data.winningHash,
          data.winningTicket,
          data.totalTickets
        );
        setVerifyReport(report);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load game data');
      setGameData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#030508]/85 backdrop-blur-xl select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="glass-capsule rounded-3xl p-6 sm:p-7 max-w-xl w-full relative overflow-hidden text-[#F5F7FA] max-h-[88vh] flex flex-col font-sans shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(205, 180, 134,0.1)] border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CDB486] font-bold">
                  CRYPTOGRAPHIC AUDIT
                </span>
                <span className="px-2 py-0.5 border border-[#CDB486]/30 bg-[#CDB486]/10 text-[#CDB486] text-[9px] font-mono tracking-wider rounded-full font-bold">
                  HMAC-SHA256
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold tracking-wide uppercase text-[#F5F7FA]">
                VERIFY ROUND INTEGRITY
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8993A4] hover:text-[#F5F7FA] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="pt-4 pb-3 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchGame(inputGameId);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-[#8993A4] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ENTER ROUND ID (E.G. KOFUKU-15AFD5)"
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                  className="glass-input w-full pl-10 pr-4 py-2.5 text-xs font-mono text-[#F5F7FA] placeholder-[#8993A4]/50 uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="glass-btn-inflated px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'AUDIT'}
              </button>
            </form>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-1">
            {error && (
              <div className="p-3.5 border border-rose-500/30 bg-rose-950/20 rounded-2xl text-rose-300 text-xs font-mono">
                ✕ {error}
              </div>
            )}

            {gameData && (
              <>
                {/* Verification Checklist Banner */}
                {verifyReport && (
                  <div
                    className={`p-4 glass-capsule rounded-2xl ${
                      verifyReport.allPassed
                        ? 'border border-[#CDB486]/40 shadow-[0_0_20px_rgba(205, 180, 134,0.1)]'
                        : 'border border-rose-500/40 bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#CDB486]">
                        MATHEMATICAL PROOF AUDIT
                      </span>
                      <span className="glass-pill-active text-[9px] font-mono font-bold px-2.5 py-0.5">
                        {verifyReport.allPassed ? '100% PROVABLY FAIR' : 'AUDIT FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono">
                      <div className="flex items-center gap-2 text-[#F5F7FA]">
                        {verifyReport.serverSeedValid ? <Check className="w-3.5 h-3.5 text-[#CDB486]" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                        <span>SERVER SEED COMMITTED</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#F5F7FA]">
                        {verifyReport.gameHashValid ? <Check className="w-3.5 h-3.5 text-[#CDB486]" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                        <span>GAME HASH UNALTERED</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#F5F7FA]">
                        {verifyReport.winningHashValid ? <Check className="w-3.5 h-3.5 text-[#CDB486]" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                        <span>HMAC HASH MATCHED</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#F5F7FA]">
                        {verifyReport.winningTicketValid ? <Check className="w-3.5 h-3.5 text-[#CDB486]" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                        <span>TICKET MODULO VERIFIED</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Parameters Breakdown */}
                <div className="p-4 glass-capsule rounded-2xl space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8993A4]">ROUND ID:</span>
                    <span className="font-bold text-[#CDB486]">{gameData.gameId}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8993A4]">NONCE SEQUENCE:</span>
                    <span className="font-bold text-[#F5F7FA]">{gameData.nonce}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8993A4]">PUBLIC CLIENT SEED:</span>
                    <span className="text-[#F5F7FA] truncate max-w-[240px]">{gameData.publicSeed}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8993A4]">TOTAL TICKETS MINTED:</span>
                    <span className="font-bold text-[#F5F7FA]">{gameData.totalTickets?.toLocaleString()} Tickets</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8993A4]">TOTAL {TOKEN_SYMBOL} POOL:</span>
                    <span className="font-bold text-[#CDB486]">{gameData.totalPool?.toLocaleString()} {TOKEN_SYMBOL}</span>
                  </div>

                  {gameData.winner && (
                    <>
                      <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-[#8993A4]">DRAWN TICKET NUMBER:</span>
                        <span className="font-bold text-[#CDB486] text-sm">#{gameData.winner.winningTicket}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8993A4]">WINNING RECIPIENT:</span>
                        <span className="text-[11px] truncate max-w-[240px] font-bold text-[#F5F7FA]">{gameData.winner.address}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Cryptographic Hashes */}
                <div className="space-y-2.5 text-[11px] font-mono">
                  {/* Game Hash */}
                  <div className="p-3.5 glass-capsule rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#8993A4] uppercase font-bold text-[10px]">INITIAL GAME HASH</span>
                      <button
                        onClick={() => handleCopy(gameData.gameHash, 'gameHash')}
                        className="text-[#8993A4] hover:text-[#CDB486] transition-colors cursor-pointer"
                      >
                        {copied === 'gameHash' ? <span className="text-xs text-[#CDB486]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="break-all text-[11px] text-[#F5F7FA]/80">{gameData.gameHash}</p>
                  </div>

                  {/* Server Seed Hash */}
                  <div className="p-3.5 glass-capsule rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#8993A4] uppercase font-bold text-[10px]">SERVER SEED COMMITMENT (SHA-256)</span>
                      <button
                        onClick={() => handleCopy(gameData.serverSeedHash, 'serverSeedHash')}
                        className="text-[#8993A4] hover:text-[#CDB486] transition-colors cursor-pointer"
                      >
                        {copied === 'serverSeedHash' ? <span className="text-xs text-[#CDB486]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="break-all text-[11px] text-[#F5F7FA]/80">{gameData.serverSeedHash}</p>
                  </div>

                  {/* Revealed Server Seed */}
                  {gameData.revealedServerSeed ? (
                    <div className="p-3.5 glass-capsule rounded-2xl border border-[#CDB486]/40 bg-[#CDB486]/[0.06]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[#CDB486] uppercase font-bold text-[10px]">REVEALED SERVER SECRET SEED</span>
                        <button
                          onClick={() => handleCopy(gameData.revealedServerSeed, 'serverSeed')}
                          className="text-[#CDB486] hover:text-white transition-colors cursor-pointer"
                        >
                          {copied === 'serverSeed' ? <span className="text-xs text-[#CDB486]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="break-all text-[11px] font-bold text-[#CDB486]">{gameData.revealedServerSeed}</p>
                    </div>
                  ) : (
                    <div className="p-3.5 glass-capsule rounded-2xl text-[#8993A4] text-[11px] font-mono">
                      SEALED: Server seed remains locked in hardware escrow until round settlement.
                    </div>
                  )}

                  {/* Winning Hash */}
                  {gameData.winningHash && (
                    <div className="p-3.5 glass-capsule rounded-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[#8993A4] uppercase font-bold text-[10px]">HMAC-SHA256 DRAW DIGEST</span>
                        <button
                          onClick={() => handleCopy(gameData.winningHash, 'winHash')}
                          className="text-[#8993A4] hover:text-[#CDB486] transition-colors cursor-pointer"
                        >
                          {copied === 'winHash' ? <span className="text-xs text-[#CDB486]">COPIED</span> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="break-all text-[11px] text-[#F5F7FA]/80">{gameData.winningHash}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
