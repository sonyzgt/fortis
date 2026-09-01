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
          className="bg-[#060b17]/98 border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(0,240,255,0.25)] rounded-2xl p-6 max-w-lg w-full relative overflow-hidden backdrop-blur-2xl text-white max-h-[85vh] flex flex-col select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient neon cyan glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00f0ff]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wider flex items-center gap-2 font-orbitron">
                  PROVABLY FAIR VERIFIER
                  <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-400/40 text-[#00f0ff] text-[9px] font-mono font-bold rounded">
                    HMAC-SHA256
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Independent cryptographic verification of round outcomes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ENTER GAME ID (E.G. PONSPOT-8F3A91)"
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-3 py-2 bg-[#091224] border border-cyan-500/30 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00f0ff] focus:shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="cyber-btn-cyan px-4 py-2 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm flex-shrink-0 font-orbitron"
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
                    className={`p-3.5 rounded-xl border backdrop-blur-xl ${
                      verifyReport.allPassed
                        ? 'bg-[#09182b] border-[#00ff88]/50 shadow-[0_0_20px_rgba(0,255,136,0.2)]'
                        : 'bg-rose-950/60 border-rose-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black tracking-wider flex items-center gap-1.5 text-white font-orbitron">
                        <Cpu className="w-3.5 h-3.5 text-[#00f0ff]" />
                        CRYPTOGRAPHIC VERIFICATION
                      </span>
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                          verifyReport.allPassed ? 'bg-emerald-950/90 text-[#00ff88] border border-[#00ff88]/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {verifyReport.allPassed ? '100% PROVABLY FAIR' : 'VERIFICATION FAILED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-[#00ff88]">
                        {verifyReport.serverSeedValid ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>SERVER SEED MATCH</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#00ff88]">
                        {verifyReport.gameHashValid ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>GAME HASH MATCH</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#00ff88]">
                        {verifyReport.winningHashValid ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>WINNING HASH MATCH</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#00ff88]">
                        {verifyReport.winningTicketValid ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                        <span>WINNING TICKET MATCH</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Game Parameters Breakdown */}
                <div className="p-3.5 rounded-xl bg-[#091224] border border-cyan-500/30 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Game ID:</span>
                    <span className="font-bold text-[#00f0ff]">{gameData.gameId}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Nonce:</span>
                    <span className="text-white font-bold">{gameData.nonce}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Public Seed:</span>
                    <span className="text-white">{gameData.publicSeed}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Pool Tickets:</span>
                    <span className="font-bold text-white">{gameData.totalTickets.toLocaleString()} Tickets</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total PONSPOT Pool:</span>
                    <span className="font-bold text-[#00ff88]">{gameData.totalPool.toLocaleString()} PONS</span>
                  </div>

                  {gameData.winner && (
                    <>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-slate-400">Winning Ticket Drawn:</span>
                        <span className="font-black text-[#00ff88] text-sm">#{gameData.winner.winningTicket}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Winner Address:</span>
                        <span className="text-cyan-300 text-[11px] truncate max-w-[200px] font-bold">{gameData.winner.address}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Cryptographic Hashes */}
                <div className="space-y-2 text-[11px] font-mono">
                  {/* Game Hash */}
                  <div className="p-2.5 rounded-lg bg-[#091224] border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 uppercase font-bold text-[9px]">Game Hash</span>
                      <button
                        onClick={() => handleCopy(gameData.gameHash, 'gameHash')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copied === 'gameHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-slate-300 break-all text-[10px]">{gameData.gameHash}</p>
                  </div>

                  {/* Server Seed Hash */}
                  <div className="p-2.5 rounded-lg bg-[#091224] border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 uppercase font-bold text-[9px]">Server Seed Hash (Pre-Commitment)</span>
                      <button
                        onClick={() => handleCopy(gameData.serverSeedHash, 'serverSeedHash')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copied === 'serverSeedHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-slate-300 break-all text-[10px]">{gameData.serverSeedHash}</p>
                  </div>

                  {/* Revealed Server Seed */}
                  {gameData.revealedServerSeed ? (
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-[#00ff88]/40">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#00ff88] uppercase font-bold text-[9px]">Revealed Server Seed (Post-Game)</span>
                        <button
                          onClick={() => handleCopy(gameData.revealedServerSeed, 'serverSeed')}
                          className="text-[#00ff88] hover:text-white"
                        >
                          {copied === 'serverSeed' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-[#00ff88] break-all text-[10px] font-bold">{gameData.revealedServerSeed}</p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-[#091224] border border-cyan-500/20 text-slate-400 text-[10px] italic">
                      🔒 Server Seed remains locked until the round finishes.
                    </div>
                  )}

                  {/* Winning Hash */}
                  {gameData.winningHash && (
                    <div className="p-2.5 rounded-lg bg-[#091224] border border-cyan-500/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cyan-400 uppercase font-bold text-[9px]">HMAC-SHA256 Result</span>
                        <button
                          onClick={() => handleCopy(gameData.winningHash, 'winHash')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copied === 'winHash' ? 'Copied' : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-slate-300 break-all text-[10px]">{gameData.winningHash}</p>
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
