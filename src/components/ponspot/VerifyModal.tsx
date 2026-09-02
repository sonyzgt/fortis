'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, X, Search, RefreshCw, Copy, Cpu } from 'lucide-react';
import { verifyGameClientSide } from '@/lib/web3/contracts';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface VerifyModalProps {
  isOpen: boolean;
  gameId: string | null;
  onClose: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, gameId, onClose }) => {
  const [inputGameId, setInputGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<any | null>(null);
  const [verifyReport, setVerifyReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
        throw new Error('Game not found or still in progress.');
      }
      const data = await res.json();
      setGameData(data);

      // If game is completed with revealed server seed, run client-side verification
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#F5F8F3]/95 dark:bg-[#0c1611]/95 border-2 border-white/90 dark:border-[#718D76]/40 rounded-3xl p-6 shadow-2xl max-w-lg w-full relative overflow-hidden backdrop-blur-2xl text-[#243329] dark:text-[#F5F8F3] max-h-[85vh] flex flex-col select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient sage glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#718D76]/15 dark:bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-[#718D76]/25 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#718D76]/15 dark:bg-[#718D76]/30 border border-[#718D76]/30 flex items-center justify-center text-[#718D76] dark:text-emerald-400 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#243329] dark:text-white tracking-wide flex items-center gap-2">
                  PROVABLY FAIR VERIFIER
                  <span className="px-1.5 py-0.2 bg-[#718D76]/15 dark:bg-[#718D76]/30 border border-[#718D76]/30 text-[#718D76] dark:text-emerald-400 text-[9px] font-mono font-bold rounded">
                    HMAC-SHA256
                  </span>
                </h3>
                <p className="text-[10px] text-[#526256] dark:text-slate-400 font-mono">Independent cryptographic verification of round outcomes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#526256] dark:text-slate-400 hover:text-[#243329] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="pt-3 pb-2 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchGame(inputGameId);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#526256] dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Game ID (e.g., PONSPOT-8F3A91)"
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-3 py-2 bg-white/70 dark:bg-[#122019]/80 border border-white/90 dark:border-[#718D76]/35 rounded-xl text-xs font-mono text-[#243329] dark:text-white placeholder-[#526256]/50 dark:placeholder-slate-500 focus:outline-none focus:border-[#718D76] dark:focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-sage px-4 py-2 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm flex-shrink-0"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'VERIFY'}
              </button>
            </form>
          </div>

          {/* Body Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-mono">
                ✕ {error}
              </div>
            )}

            {gameData && (
              <>
                {/* Verification Checklist Banner */}
                {verifyReport && (
                  <div
                    className={`p-3.5 rounded-2xl border backdrop-blur-xl ${
                      verifyReport.allPassed
                        ? 'bg-white/70 dark:bg-[#14241d]/70 border-emerald-600/30 shadow-sm'
                        : 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black tracking-wide flex items-center gap-1.5 text-[#243329] dark:text-white">
                        <Cpu className="w-3.5 h-3.5 text-[#718D76] dark:text-emerald-400" />
                        MATHEMATICAL VERIFICATION RESULT
                      </span>
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                          verifyReport.allPassed ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {verifyReport.allPassed ? '100% PROVABLY FAIR' : 'VERIFICATION FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        {verifyReport.serverSeedValid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                        <span>SERVER SEED VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        {verifyReport.gameHashValid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                        <span>GAME HASH VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        {verifyReport.winningHashValid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                        <span>WINNING HASH VERIFIED</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        {verifyReport.winningTicketValid ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                        <span>WINNING TICKET VERIFIED</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Parameters Breakdown */}
                <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-[#14241d]/70 border border-white/80 dark:border-[#718D76]/35 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#526256] dark:text-slate-400">Game ID:</span>
                    <span className="font-bold text-[#718D76] dark:text-emerald-400">{gameData.gameId}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#526256] dark:text-slate-400">Nonce:</span>
                    <span className="text-[#243329] dark:text-white font-bold">{gameData.nonce}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#526256] dark:text-slate-400">Public Seed:</span>
                    <span className="text-[#243329] dark:text-white">{gameData.publicSeed}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#526256] dark:text-slate-400">Total Pool Tickets:</span>
                    <span className="font-bold text-[#243329] dark:text-white">{gameData.totalTickets.toLocaleString()} Tickets</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#526256] dark:text-slate-400">Total PONSPOT Pool:</span>
                    <span className="font-bold text-[#718D76] dark:text-emerald-400">{gameData.totalPool.toLocaleString()} PONSPOT</span>
                  </div>

                  {gameData.winner && (
                    <>
                      <div className="pt-2 border-t border-white/60 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[#526256] dark:text-slate-400">Winning Ticket Drawn:</span>
                        <span className="font-black text-[#718D76] dark:text-emerald-400 text-sm">#{gameData.winner.winningTicket}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#526256] dark:text-slate-400">Winner Address:</span>
                        <span className="text-[#243329] dark:text-white text-[11px] truncate max-w-[200px] font-bold">{gameData.winner.address}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Cryptographic Hashes */}
                <div className="space-y-2 text-[11px] font-mono">
                  {/* Game Hash */}
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-[#122019]/70 border border-white/80 dark:border-[#718D76]/25">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#526256] dark:text-slate-400 uppercase font-bold text-[9px]">Game Hash</span>
                      <button
                        onClick={() => handleCopy(gameData.gameHash, 'gameHash')}
                        className="text-[#526256] dark:text-slate-400 hover:text-[#243329] dark:hover:text-white"
                      >
                        {copied === 'gameHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[#243329] dark:text-white break-all text-[10px]">{gameData.gameHash}</p>
                  </div>

                  {/* Server Seed Hash */}
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-[#122019]/70 border border-white/80 dark:border-[#718D76]/25">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#526256] dark:text-slate-400 uppercase font-bold text-[9px]">Server Seed Hash (Pre-Commitment)</span>
                      <button
                        onClick={() => handleCopy(gameData.serverSeedHash, 'serverSeedHash')}
                        className="text-[#526256] dark:text-slate-400 hover:text-[#243329] dark:hover:text-white"
                      >
                        {copied === 'serverSeedHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[#243329] dark:text-white break-all text-[10px]">{gameData.serverSeedHash}</p>
                  </div>

                  {/* Revealed Server Seed */}
                  {gameData.revealedServerSeed ? (
                    <div className="p-2.5 rounded-xl bg-[#718D76]/10 dark:bg-emerald-950/30 border border-[#718D76]/30 dark:border-emerald-500/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#718D76] dark:text-emerald-400 uppercase font-bold text-[9px]">Revealed Server Seed (Post-Game)</span>
                        <button
                          onClick={() => handleCopy(gameData.revealedServerSeed, 'serverSeed')}
                          className="text-[#718D76] dark:text-emerald-400 hover:text-[#243329] dark:hover:text-white"
                        >
                          {copied === 'serverSeed' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[#718D76] dark:text-emerald-300 break-all text-[10px] font-bold">{gameData.revealedServerSeed}</p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-[#122019]/70 border border-white/80 dark:border-[#718D76]/25 text-[#526256] dark:text-slate-400 text-[10px] italic">
                      🔒 Server Seed remains locked until the round finishes.
                    </div>
                  )}

                  {/* Winning Hash */}
                  {gameData.winningHash && (
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-[#122019]/70 border border-white/80 dark:border-[#718D76]/25">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#526256] dark:text-slate-400 uppercase font-bold text-[9px]">HMAC-SHA256 Result</span>
                        <button
                          onClick={() => handleCopy(gameData.winningHash, 'winHash')}
                          className="text-[#526256] dark:text-slate-400 hover:text-[#243329] dark:hover:text-white"
                        >
                          {copied === 'winHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[#243329] dark:text-white break-all text-[10px]">{gameData.winningHash}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
